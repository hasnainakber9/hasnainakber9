using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.TextCore.LowLevel;
using UnityEngine.Timeline;
using TMPro;

namespace GoodFood.EditorTools
{
    // Builds Assets/GoodFood/Scenes/GoodFood_Master.unity from the exported film:
    //   one root per shot (animated GLB set + cast, lights, a camera rig with the film's exact camera path and focus pulls),
    //   a master Timeline (shot activation, performance and camera tracks, final mix, muted stems and dialogue lines),
    //   a global URP Volume (ACES, bloom, vignette, Bokeh DOF, grain) and a caption + title-card overlay.
    // Run it from the menu: Good Food > Build Master Scene and Timeline. It is safe to run again; it rebuilds everything.
    public static class GoodFoodBuilder
    {
        const string Root = "Assets/GoodFood";
        const string Gen = Root + "/Generated";
        // three.js r170 light units are not Unity's; these starting points keep the look close and are meant to be tuned
        const float DirectionalScale = 0.5f;
        const float LocalLightScale = 0.15f;

        [MenuItem("Good Food/Build Master Scene and Timeline", priority = 1)]
        public static void Build()
        {
            var edlAsset = AssetDatabase.LoadAssetAtPath<TextAsset>(Root + "/Data/edit.json");
            if (edlAsset == null) { Debug.LogError("Good Food: Assets/GoodFood/Data/edit.json is missing. Run film/export_unity.py first."); return; }
            var edl = EditDecisionList.FromJson(edlAsset.text);

            foreach (var f in new[] { Gen, Gen + "/Cameras", Gen + "/Clips", Gen + "/Sky", Gen + "/UI", Root + "/Scenes" }) EnsureFolder(f);
            if (EnsurePipeline()) ReimportModels();       // glTFast picks URP shaders only when URP is active at import time
            PrepareImports();

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var volume = CreateVolume();

            var timelinePath = Gen + "/GoodFood_Master.playable";
            AssetDatabase.DeleteAsset(timelinePath);
            var timeline = ScriptableObject.CreateInstance<TimelineAsset>();
            AssetDatabase.CreateAsset(timeline, timelinePath);
            timeline.editorSettings.frameRate = edl.fps;

            var directorGo = new GameObject("Master Director");
            directorGo.AddComponent<AudioListener>();
            var director = directorGo.AddComponent<PlayableDirector>();
            director.playableAsset = timeline;
            director.playOnAwake = true;
            director.extrapolationMode = DirectorWrapMode.Hold;
            director.timeUpdateMode = DirectorUpdateMode.GameTime;

            var shotsGroup = timeline.CreateTrack<GroupTrack>(null, "Shots");
            var shotRoots = new List<GameObject>();
            foreach (var s in edl.shots)
            {
                if (string.IsNullOrEmpty(s.glb)) continue;
                var data = LoadShot(s.id);
                if (data == null) { Debug.LogWarning("Good Food: no sidecar for " + s.id); continue; }
                var root = BuildShot(s, data, timeline, shotsGroup, director);
                if (root != null) shotRoots.Add(root);
            }

            var overlay = BuildOverlay(edl, edlAsset, director);
            var titleTrack = timeline.CreateTrack<ActivationTrack>(null, "Title card");
            var title = edl.shots.FirstOrDefault(x => x.id == (edl.titleCard != null ? edl.titleCard.shot : "s11"));
            if (title != null)
            {
                var clip = titleTrack.CreateDefaultClip(); clip.start = title.start; clip.duration = title.duration; clip.displayName = "GOOD FOOD. NO DEAD ENDS.";
                director.SetGenericBinding(titleTrack, overlay.title.gameObject);
            }

            BuildAudio(edl, timeline);

            foreach (var r in shotRoots) r.SetActive(false);
            overlay.title.gameObject.SetActive(false);
            EditorUtility.SetDirty(timeline);
            AssetDatabase.SaveAssets();
            EditorSceneManager.SaveScene(scene, Root + "/Scenes/GoodFood_Master.unity");
            Selection.activeGameObject = directorGo;
            EditorApplication.ExecuteMenuItem("Window/Sequencing/Timeline");
            Debug.Log("Good Food: built " + shotRoots.Count + " shots, " + edl.duration + " s at " + edl.fps + " fps. Press Play, or open Good Food > Open Recorder to render the master.");
        }

        [MenuItem("Good Food/Open Recorder", priority = 20)]
        static void OpenRecorder()
        {
            if (!EditorApplication.ExecuteMenuItem("Window/General/Recorder/Recorder Window"))
                Debug.LogWarning("Good Food: Recorder window not found. Install com.unity.recorder from the Package Manager.");
        }

        // ------------------------------------------------------------------ shots
        static GameObject BuildShot(EdlShot s, ShotData d, TimelineAsset timeline, TrackAsset group, PlayableDirector director)
        {
            var glbPath = Root + "/Shots/" + s.glb;
            var model = AssetDatabase.LoadAssetAtPath<GameObject>(glbPath);
            if (model == null) { Debug.LogError("Good Food: could not load " + glbPath + " (is glTFast installed?)"); return null; }

            var root = new GameObject("Shot " + s.id);
            var cast = (GameObject)PrefabUtility.InstantiatePrefab(model, root.transform);
            cast.name = s.id + " set and cast";
            var legacy = cast.GetComponent<Animation>();
            if (legacy != null) Object.DestroyImmediate(legacy);
            var animator = cast.GetComponent<Animator>();
            if (animator == null) animator = cast.AddComponent<Animator>();
            animator.applyRootMotion = false;
            foreach (var mr in cast.GetComponentsInChildren<Renderer>(true)) mr.shadowCastingMode = ShadowCastingMode.On;

            var env = root.AddComponent<ShotEnvironment>();
            Light sun = null;
            foreach (var l in d.lights ?? new LightData[0]) BuildLight(l, root.transform, env, ref sun);
            env.sun = sun;
            env.skybox = SkyMaterial(s.id, d);
            env.reflection = HdriCubemap(d.envHdri);
            env.fog = d.hasFog;
            env.fogColor = ThreeToUnity.Hex(d.fogColor, Color.gray);
            env.fogStart = d.fogNear;
            env.fogEnd = d.fogFar;
            env.postExposure = Mathf.Log(Mathf.Max(0.01f, d.exposure), 2f);
            env.saturation = Mathf.Clamp((d.sat - 1f) * 100f, -100f, 100f);
            env.contrast = Mathf.Clamp((d.contrast - 1f) * 100f, -100f, 100f);
            env.temperature = Mathf.Clamp((d.warmth - 1f) * 150f, -100f, 100f);
            env.bloomIntensity = d.bloomStrength * 1.5f;
            env.bloomThreshold = Mathf.Clamp(d.bloomThreshold * 1.1f, 0.5f, 1.2f);
            env.vignette = Mathf.Clamp01(d.vignette * 0.8f);
            env.grain = Mathf.Clamp01(d.grain * 6f);

            // camera rig: the Animator sits on the rig so the camera curves are never treated as root motion
            var rig = new GameObject("Camera Rig " + s.id);
            rig.transform.SetParent(root.transform, false);
            var camGo = new GameObject("Cam");
            camGo.transform.SetParent(rig.transform, false);
            camGo.tag = "MainCamera";
            var cam = camGo.AddComponent<Camera>();
            cam.nearClipPlane = Mathf.Max(0.01f, d.near);
            cam.farClipPlane = Mathf.Max(100f, d.far);
            cam.fieldOfView = d.cam != null && d.cam.Length > 8 ? d.cam[8] : 30f;
            var camData = cam.GetUniversalAdditionalCameraData();
            camData.renderPostProcessing = true;
            camData.antialiasing = AntialiasingMode.SubpixelMorphologicalAntiAliasing;
            camGo.AddComponent<ShotFocus>();
            var rigAnimator = rig.AddComponent<Animator>();
            var camClip = BuildCameraClip(s.id, d);
            ApplyFirstFrame(camGo.transform, cam, d);

            var act = timeline.CreateTrack<ActivationTrack>(group, s.id + " on");
            var ac = act.CreateDefaultClip(); ac.start = s.start; ac.duration = s.duration; ac.displayName = s.id;
            director.SetGenericBinding(act, root);

            var perf = AssetDatabase.LoadAllAssetsAtPath(glbPath).OfType<AnimationClip>().FirstOrDefault(c => !c.name.StartsWith("__preview__"));
            if (perf != null)
            {
                if (perf.legacy)
                {
                    var copyPath = Gen + "/Clips/" + s.id + "_performance.anim";
                    AssetDatabase.DeleteAsset(copyPath);
                    var copy = Object.Instantiate(perf); copy.legacy = false; copy.name = s.id + "_performance";
                    AssetDatabase.CreateAsset(copy, copyPath);
                    perf = copy;
                }
                var pt = timeline.CreateTrack<AnimationTrack>(group, s.id + " performance");
                var pc = pt.CreateClip(perf); pc.start = s.start; pc.duration = s.duration; pc.displayName = s.id + " performance";
                var pa = pc.asset as AnimationPlayableAsset; if (pa != null) pa.removeStartOffset = false;
                director.SetGenericBinding(pt, animator);
            }
            else Debug.LogWarning("Good Food: " + s.glb + " has no animation clip; the shot will be static.");

            var ct = timeline.CreateTrack<AnimationTrack>(group, s.id + " camera");
            var cc = ct.CreateClip(camClip); cc.start = s.start; cc.duration = s.duration; cc.displayName = s.id + " camera";
            var ca = cc.asset as AnimationPlayableAsset; if (ca != null) ca.removeStartOffset = false;
            director.SetGenericBinding(ct, rigAnimator);
            return root;
        }

        static void BuildLight(LightData l, Transform parent, ShotEnvironment env, ref Light sun)
        {
            switch (l.type)
            {
                case "hemisphere":
                {
                    var sky = ThreeToUnity.Hex(l.sky, Color.gray) * l.intensity;
                    var ground = ThreeToUnity.Hex(l.ground, Color.gray) * l.intensity;
                    sky.a = 1f; ground.a = 1f;
                    env.ambientSky = sky; env.ambientGround = ground; env.ambientEquator = Color.Lerp(sky, ground, 0.5f);
                    return;
                }
                case "ambient":
                {
                    var a = ThreeToUnity.Hex(l.color, Color.gray) * l.intensity; a.a = 1f;
                    env.ambientSky += a; env.ambientEquator += a; env.ambientGround += a;
                    return;
                }
            }
            var go = new GameObject(l.type == "directional" ? "Sun" : l.type + " light");
            go.transform.SetParent(parent, false);
            var lt = go.AddComponent<Light>();
            lt.color = ThreeToUnity.Hex(l.color, Color.white);
            lt.shadows = l.shadows ? LightShadows.Soft : LightShadows.None;
            if (l.type == "directional")
            {
                lt.type = LightType.Directional;
                lt.intensity = l.intensity * DirectionalScale;
                go.transform.rotation = Quaternion.LookRotation(ThreeToUnity.Direction(l.dir));
                if (sun == null || (l.shadows && sun.shadows == LightShadows.None)) sun = lt;
            }
            else
            {
                lt.type = l.type == "spot" ? LightType.Spot : LightType.Point;
                lt.intensity = l.intensity * LocalLightScale;
                lt.range = l.range > 0f ? l.range : 12f;
                go.transform.position = ThreeToUnity.Position(l.pos);
                if (lt.type == LightType.Spot)
                {
                    go.transform.rotation = Quaternion.LookRotation(ThreeToUnity.Direction(l.dir));
                    lt.spotAngle = Mathf.Clamp(l.angle * 2f * Mathf.Rad2Deg, 1f, 179f);
                    lt.innerSpotAngle = lt.spotAngle * Mathf.Clamp01(1f - l.penumbra);
                }
            }
        }

        // ------------------------------------------------------------------ camera clip from the film's per-frame camera samples
        static AnimationClip BuildCameraClip(string id, ShotData d)
        {
            var path = Gen + "/Cameras/" + id + "_camera.anim";
            AssetDatabase.DeleteAsset(path);
            var clip = new AnimationClip { name = id + "_camera", frameRate = d.fps };
            int stride = d.camStride > 0 ? d.camStride : 11;
            int n = d.cam == null ? 0 : d.cam.Length / stride;
            var curves = new AnimationCurve[11];
            for (int c = 0; c < curves.Length; c++) curves[c] = new AnimationCurve();
            Quaternion prev = Quaternion.identity;
            for (int i = 0; i < n; i++)
            {
                int o = i * stride; float t = d.cam[o];
                var p = ThreeToUnity.Position(d.cam[o + 1], d.cam[o + 2], d.cam[o + 3]);
                var q = ThreeToUnity.CameraRotation(d.cam[o + 4], d.cam[o + 5], d.cam[o + 6], d.cam[o + 7]);
                if (i > 0 && Quaternion.Dot(prev, q) < 0f) q = new Quaternion(-q.x, -q.y, -q.z, -q.w);
                prev = q;
                float[] v = { p.x, p.y, p.z, q.x, q.y, q.z, q.w, d.cam[o + 8], d.cam[o + 9] > 0f ? d.cam[o + 9] : 3f, d.cam[o + 10] > 0f ? d.cam[o + 10] : 0.004f };
                for (int c = 0; c < v.Length; c++) curves[c].AddKey(new Keyframe(t, v[c]));
            }
            // linear between frames; hold the last frame before each in-shot cut so the cut lands exactly on a frame
            var holds = new HashSet<int>();
            if (d.cuts != null) foreach (var cut in d.cuts) holds.Add(Mathf.CeilToInt(cut * d.fps - 1e-3f) - 1);
            for (int c = 0; c < 10; c++)
                for (int k = 0; k < curves[c].length; k++)
                {
                    AnimationUtility.SetKeyLeftTangentMode(curves[c], k, AnimationUtility.TangentMode.Linear);
                    AnimationUtility.SetKeyRightTangentMode(curves[c], k, holds.Contains(k) ? AnimationUtility.TangentMode.Constant : AnimationUtility.TangentMode.Linear);
                }
            string[] tr = { "m_LocalPosition.x", "m_LocalPosition.y", "m_LocalPosition.z", "m_LocalRotation.x", "m_LocalRotation.y", "m_LocalRotation.z", "m_LocalRotation.w" };
            for (int c = 0; c < tr.Length; c++) AnimationUtility.SetEditorCurve(clip, EditorCurveBinding.FloatCurve("Cam", typeof(Transform), tr[c]), curves[c]);
            AnimationUtility.SetEditorCurve(clip, EditorCurveBinding.FloatCurve("Cam", typeof(Camera), "field of view"), curves[7]);
            AnimationUtility.SetEditorCurve(clip, EditorCurveBinding.FloatCurve("Cam", typeof(ShotFocus), "focusDistance"), curves[8]);
            AnimationUtility.SetEditorCurve(clip, EditorCurveBinding.FloatCurve("Cam", typeof(ShotFocus), "filmAperture"), curves[9]);
            clip.EnsureQuaternionContinuity();
            AssetDatabase.CreateAsset(clip, path);
            return clip;
        }

        static void ApplyFirstFrame(Transform cam, Camera c, ShotData d)
        {
            if (d.cam == null || d.cam.Length < 11) return;
            cam.localPosition = ThreeToUnity.Position(d.cam[1], d.cam[2], d.cam[3]);
            cam.localRotation = ThreeToUnity.CameraRotation(d.cam[4], d.cam[5], d.cam[6], d.cam[7]);
            c.fieldOfView = d.cam[8];
        }

        // ------------------------------------------------------------------ look: sky, reflections, post
        static Material SkyMaterial(string id, ShotData d)
        {
            var path = Gen + "/Sky/" + id + "_sky.mat";
            AssetDatabase.DeleteAsset(path);
            var shader = Shader.Find("Skybox/Procedural");
            if (shader == null) return null;
            var m = new Material(shader);
            m.SetFloat("_SunSize", 0.035f);
            m.SetFloat("_AtmosphereThickness", 0.85f);
            m.SetColor("_SkyTint", d.hasFog ? ThreeToUnity.Hex(d.fogColor, new Color(0.5f, 0.5f, 0.5f)) : new Color(0.5f, 0.5f, 0.5f));
            m.SetFloat("_Exposure", 1.1f);
            AssetDatabase.CreateAsset(m, path);
            return m;
        }

        static Texture HdriCubemap(string name)
        {
            if (string.IsNullOrEmpty(name)) return null;
            return AssetDatabase.LoadAssetAtPath<Cubemap>(Root + "/Environment/" + name + ".exr");
        }

        static Volume CreateVolume()
        {
            var path = Gen + "/GoodFood_Volume.asset";
            AssetDatabase.DeleteAsset(path);
            var profile = ScriptableObject.CreateInstance<VolumeProfile>();
            AssetDatabase.CreateAsset(profile, path);
            var tm = profile.Add<Tonemapping>(true); tm.mode.Override(TonemappingMode.ACES);
            var bloom = profile.Add<Bloom>(true); bloom.intensity.Override(0.3f); bloom.threshold.Override(0.9f); bloom.scatter.Override(0.6f);
            var vig = profile.Add<Vignette>(true); vig.intensity.Override(0.3f); vig.smoothness.Override(0.45f);
            var dof = profile.Add<DepthOfField>(true); dof.mode.Override(DepthOfFieldMode.Bokeh); dof.focusDistance.Override(3f); dof.focalLength.Override(45f); dof.aperture.Override(4f);
            var grain = profile.Add<FilmGrain>(true); grain.type.Override(FilmGrainLookup.Medium1); grain.intensity.Override(0.2f);
            var ca = profile.Add<ColorAdjustments>(true); ca.postExposure.Override(0f); ca.saturation.Override(4f);
            var wb = profile.Add<WhiteBalance>(true); wb.temperature.Override(8f);
            foreach (var c in profile.components) AssetDatabase.AddObjectToAsset(c, profile);
            EditorUtility.SetDirty(profile);
            var go = new GameObject("Global Volume");
            var v = go.AddComponent<Volume>();
            v.isGlobal = true;
            v.sharedProfile = profile;
            return v;
        }

        // ------------------------------------------------------------------ captions and title card
        class Overlay { public FilmOverlay component; public GameObject title; }

        const string TitleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?'\"-()&%/\u2019\u2018\u201C\u201D\u2013\u2014\u2026";

        static Overlay BuildOverlay(EditDecisionList edl, TextAsset edlAsset, PlayableDirector director)
        {
            var tc = edl.titleCard;
            string accent = tc != null ? tc.accent : "#d8401f";
            var cream = ThreeToUnity.Hex(tc != null ? tc.text : "#f6f1e8", Color.white);

            // non-interactive overlay: no GraphicRaycaster, every graphic has Raycast Target off
            var go = new GameObject("FilmOverlay");
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;
            var scaler = go.AddComponent<UnityEngine.UI.CanvasScaler>();
            scaler.uiScaleMode = UnityEngine.UI.CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920, 1080);
            scaler.matchWidthOrHeight = 0.5f;          // balanced, so a 9:16 recording keeps the title inside the frame

            var titleGo = Child("TitleCard", go.transform);
            Stretch(titleGo);
            var bg = titleGo.AddComponent<UnityEngine.UI.Image>();
            bg.color = ThreeToUnity.Hex(tc != null ? tc.background : "#070605", Color.black);
            bg.raycastTarget = false;
            var titleGroup = titleGo.AddComponent<CanvasGroup>();
            titleGroup.interactable = false; titleGroup.blocksRaycasts = false;

            var ringGo = Child("Loop", titleGo.transform);
            ringGo.GetComponent<RectTransform>().sizeDelta = new Vector2(799f, 799f);   // 74 vmin of 1080
            var ring = ringGo.AddComponent<UnityEngine.UI.Image>();
            ring.sprite = AssetDatabase.LoadAssetAtPath<Sprite>(Root + "/UI/loop_ring.png");
            ring.color = ThreeToUnity.Hex(accent, Color.red);
            ring.type = UnityEngine.UI.Image.Type.Filled;
            ring.fillMethod = UnityEngine.UI.Image.FillMethod.Radial360;
            ring.fillOrigin = (int)UnityEngine.UI.Image.Origin360.Top;
            ring.fillClockwise = true;
            ring.fillAmount = 0f;
            ring.raycastTarget = false;

            var capGo = Child("Caption", go.transform);
            var capRt = capGo.GetComponent<RectTransform>();
            capRt.anchorMin = new Vector2(0.08f, 0f); capRt.anchorMax = new Vector2(0.92f, 0f); capRt.pivot = new Vector2(0.5f, 0f);
            capRt.anchoredPosition = new Vector2(0f, 81f); capRt.sizeDelta = new Vector2(0f, 140f);

            RectTransform l1, l2; UnityEngine.UI.Graphic cap;
            TMP_FontAsset black = null, bold = null; Material capMat = null;
            try
            {
                EnsureTmpEssentials();
                black = TmpFont(Root + "/Fonts/Inter-Black.otf", Gen + "/UI/Inter-Black SDF.asset");
                bold = TmpFont(Root + "/Fonts/Inter-Bold.otf", Gen + "/UI/Inter-Bold SDF.asset");
                if (bold != null) capMat = CaptionMaterial(bold);
            }
            catch (System.Exception e) { Debug.LogWarning("Good Food: TextMeshPro setup failed, using legacy Text: " + e.Message); black = bold = null; }

            if (black != null && bold != null)
            {
                l1 = TmpTitleLine("TitleLine1", titleGo.transform, black, "GOOD FOOD<color=" + accent + ">.</color>", cream);
                l2 = TmpTitleLine("TitleLine2", titleGo.transform, black, "NO DEAD ENDS<color=" + accent + ">.</color>", cream);
                var t = capGo.AddComponent<TextMeshProUGUI>();
                t.font = bold; if (capMat != null) t.fontSharedMaterial = capMat;
                t.fontSize = 56; t.alignment = TextAlignmentOptions.Bottom; t.color = Color.white; t.raycastTarget = false; t.text = "";
                cap = t;
            }
            else
            {
                var fallback = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
                var lBlack = AssetDatabase.LoadAssetAtPath<Font>(Root + "/Fonts/Inter-Black.otf");
                var lBold = AssetDatabase.LoadAssetAtPath<Font>(Root + "/Fonts/Inter-Bold.otf");
                if (lBlack == null) lBlack = fallback;
                if (lBold == null) lBold = fallback;
                l1 = LegacyTitleLine("TitleLine1", titleGo.transform, lBlack, "GOOD FOOD<color=" + accent + ">.</color>", cream);
                l2 = LegacyTitleLine("TitleLine2", titleGo.transform, lBlack, "NO DEAD ENDS<color=" + accent + ">.</color>", cream);
                var t = capGo.AddComponent<UnityEngine.UI.Text>();
                t.font = lBold; t.fontSize = 56; t.alignment = TextAnchor.LowerCenter; t.color = Color.white;
                t.horizontalOverflow = HorizontalWrapMode.Wrap; t.verticalOverflow = VerticalWrapMode.Overflow; t.raycastTarget = false;
                var outline = capGo.AddComponent<UnityEngine.UI.Outline>(); outline.effectColor = new Color(0.08f, 0.08f, 0.08f, 1f); outline.effectDistance = new Vector2(3f, -3f);
                var shadow = capGo.AddComponent<UnityEngine.UI.Shadow>(); shadow.effectColor = new Color(0f, 0f, 0f, 0.5f); shadow.effectDistance = new Vector2(2f, -3f);
                cap = t;
            }

            var fo = go.AddComponent<FilmOverlay>();
            fo.director = director; fo.editDecisionList = edlAsset; fo.caption = cap; fo.title = titleGroup;
            fo.line1 = l1; fo.line2 = l2; fo.line1Y = 66f; fo.line2Y = -66f; fo.loop = ring;
            return new Overlay { component = fo, title = titleGo };
        }

        // TMP Essential Resources (settings, default shaders) through the non-interactive importer
        static void EnsureTmpEssentials()
        {
            if (AssetDatabase.FindAssets("t:TMP_Settings").Length > 0) return;
            TMP_PackageResourceImporter.ImportResources(true, false, false);
            AssetDatabase.Refresh();
        }

        // a static SDF font asset with every character the film uses, saved with its atlas and material
        static TMP_FontAsset TmpFont(string fontPath, string assetPath)
        {
            var existing = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(assetPath);
            if (existing != null) return existing;
            var font = AssetDatabase.LoadAssetAtPath<Font>(fontPath);
            if (font == null) return null;
            EnsureFolder(Path.GetDirectoryName(assetPath).Replace('\\', '/'));
            var fa = TMP_FontAsset.CreateFontAsset(font, 64, 8, GlyphRenderMode.SDFAA, 1024, 1024, AtlasPopulationMode.Dynamic, true);
            if (fa == null) return null;
            fa.name = Path.GetFileNameWithoutExtension(assetPath);
            fa.TryAddCharacters(TitleChars);
            fa.atlasPopulationMode = AtlasPopulationMode.Static;
            AssetDatabase.CreateAsset(fa, assetPath);
            for (int i = 0; i < fa.atlasTextures.Length; i++)
            {
                if (fa.atlasTextures[i] == null) continue;
                fa.atlasTextures[i].name = fa.name + " Atlas " + i;
                AssetDatabase.AddObjectToAsset(fa.atlasTextures[i], fa);
            }
            if (fa.material != null) { fa.material.name = fa.name + " Material"; AssetDatabase.AddObjectToAsset(fa.material, fa); }
            EditorUtility.SetDirty(fa);
            AssetDatabase.SaveAssets();
            return fa;
        }

        // caption material preset: dark outline plus a soft drop shadow, readable on any shot
        static Material CaptionMaterial(TMP_FontAsset font)
        {
            var path = Gen + "/UI/Caption Outline.mat";
            AssetDatabase.DeleteAsset(path);
            if (font.material == null) return null;
            var m = new Material(font.material) { name = "Caption Outline" };
            m.EnableKeyword("OUTLINE_ON");
            m.SetFloat("_OutlineWidth", 0.18f);
            m.SetColor("_OutlineColor", new Color(0.08f, 0.08f, 0.08f, 1f));
            m.EnableKeyword("UNDERLAY_ON");
            m.SetColor("_UnderlayColor", new Color(0f, 0f, 0f, 0.5f));
            m.SetFloat("_UnderlayOffsetX", 0.5f);
            m.SetFloat("_UnderlayOffsetY", -0.7f);
            m.SetFloat("_UnderlayDilate", 0.2f);
            m.SetFloat("_UnderlaySoftness", 0.3f);
            AssetDatabase.CreateAsset(m, path);
            return m;
        }

        static RectTransform TmpTitleLine(string name, Transform parent, TMP_FontAsset font, string text, Color colour)
        {
            var go = Child(name, parent);
            var rt = go.GetComponent<RectTransform>();
            rt.sizeDelta = new Vector2(1800f, 140f);
            var t = go.AddComponent<TextMeshProUGUI>();
            t.font = font; t.fontSize = 124; t.alignment = TextAlignmentOptions.Center; t.richText = true; t.text = text;
            t.characterSpacing = 2f;                    // the film's 0.02 em tracking
            t.color = colour; t.raycastTarget = false;
            go.AddComponent<CanvasGroup>().alpha = 0f;
            return rt;
        }

        static RectTransform LegacyTitleLine(string name, Transform parent, Font font, string text, Color colour)
        {
            var go = Child(name, parent);
            var rt = go.GetComponent<RectTransform>();
            rt.sizeDelta = new Vector2(1800f, 140f);
            var t = go.AddComponent<UnityEngine.UI.Text>();
            t.font = font; t.fontSize = 124; t.alignment = TextAnchor.MiddleCenter; t.supportRichText = true; t.text = text;
            t.color = colour;
            t.horizontalOverflow = HorizontalWrapMode.Overflow; t.verticalOverflow = VerticalWrapMode.Overflow; t.raycastTarget = false;
            go.AddComponent<CanvasGroup>().alpha = 0f;
            return rt;
        }

        static GameObject Child(string name, Transform parent)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        static void Stretch(GameObject go)
        {
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one; rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
        }

        // ------------------------------------------------------------------ sound
        static void BuildAudio(EditDecisionList edl, TimelineAsset timeline)
        {
            var mix = AssetDatabase.LoadAssetAtPath<AudioClip>(Root + "/Audio/final_mix.wav");
            if (mix != null)
            {
                var t = timeline.CreateTrack<AudioTrack>(null, "Final mix (-14 LUFS)");
                var c = t.CreateClip(mix); c.start = 0; c.duration = mix.length;
            }
            else Debug.LogWarning("Good Food: Audio/final_mix.wav not found.");

            var stems = timeline.CreateTrack<GroupTrack>(null, "Stems (muted, for remixing)");
            foreach (var name in new[] { "dialogue_stem", "music_stem", "ambience_stem", "foley_stem" })
            {
                var clip = AssetDatabase.LoadAssetAtPath<AudioClip>(Root + "/Audio/" + name + ".ogg");
                if (clip == null) continue;
                var t = timeline.CreateTrack<AudioTrack>(stems, name.Replace("_stem", ""));
                var c = t.CreateClip(clip); c.start = 0; c.duration = clip.length;
                t.muted = true;
            }

            var lines = timeline.CreateTrack<GroupTrack>(null, "Dialogue lines (muted, already in the mix)");
            var tracks = new Dictionary<string, AudioTrack>();
            foreach (var l in edl.dialogue ?? new EdlLine[0])
            {
                var clip = AssetDatabase.LoadAssetAtPath<AudioClip>(Root + "/Audio/Dialogue/" + l.clip);
                if (clip == null) continue;
                AudioTrack track;
                if (!tracks.TryGetValue(l.@char, out track)) { track = timeline.CreateTrack<AudioTrack>(lines, l.@char); track.muted = true; tracks[l.@char] = track; }
                var c = track.CreateClip(clip); c.start = l.start; c.duration = clip.length; c.displayName = l.text;
            }
        }

        // ------------------------------------------------------------------ project setup
        static bool EnsurePipeline()
        {
            PlayerSettings.colorSpace = ColorSpace.Linear;
            if (GraphicsSettings.defaultRenderPipeline != null) return false;
            var rendererPath = Gen + "/URP_Renderer.asset";
            var data = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(rendererPath);
            if (data == null)
            {
                data = ScriptableObject.CreateInstance<UniversalRendererData>();
                data.postProcessData = AssetDatabase.LoadAssetAtPath<PostProcessData>("Packages/com.unity.render-pipelines.universal/Runtime/Data/PostProcessData.asset");
                AssetDatabase.CreateAsset(data, rendererPath);
            }
            var assetPath = Gen + "/URP_Pipeline.asset";
            var asset = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(assetPath);
            if (asset == null)
            {
                asset = UniversalRenderPipelineAsset.Create(data);
                asset.supportsHDR = true;
                asset.msaaSampleCount = 4;
                asset.shadowDistance = 60f;
                AssetDatabase.CreateAsset(asset, assetPath);
            }
            GraphicsSettings.defaultRenderPipeline = asset;
            int current = QualitySettings.GetQualityLevel();
            for (int i = 0; i < QualitySettings.names.Length; i++) { QualitySettings.SetQualityLevel(i, false); QualitySettings.renderPipeline = asset; }
            QualitySettings.SetQualityLevel(current, false);
            AssetDatabase.SaveAssets();
            Debug.Log("Good Food: created and assigned a URP pipeline asset (" + assetPath + ").");
            return true;
        }

        static void ReimportModels()
        {
            foreach (var guid in AssetDatabase.FindAssets("", new[] { Root + "/Shots" }))
            {
                var p = AssetDatabase.GUIDToAssetPath(guid);
                if (p.EndsWith(".glb")) AssetDatabase.ImportAsset(p, ImportAssetOptions.ForceUpdate);
            }
        }

        static void PrepareImports()
        {
            foreach (var guid in AssetDatabase.FindAssets("t:Texture", new[] { Root + "/Environment" }))
            {
                var p = AssetDatabase.GUIDToAssetPath(guid);
                var ti = AssetImporter.GetAtPath(p) as TextureImporter;
                if (ti == null || ti.textureShape == TextureImporterShape.TextureCube) continue;
                var st = new TextureImporterSettings();
                ti.ReadTextureSettings(st);
                st.textureShape = TextureImporterShape.TextureCube;
                st.generateCubemap = TextureImporterGenerateCubemap.Cylindrical;
                st.cubemapConvolution = TextureImporterCubemapConvolution.Specular;
                ti.SetTextureSettings(st);
                ti.SaveAndReimport();
            }
            var ring = AssetImporter.GetAtPath(Root + "/UI/loop_ring.png") as TextureImporter;
            if (ring != null && ring.textureType != TextureImporterType.Sprite)
            {
                ring.textureType = TextureImporterType.Sprite;
                ring.alphaIsTransparency = true;
                ring.mipmapEnabled = false;
                ring.SaveAndReimport();
            }
        }

        static ShotData LoadShot(string id)
        {
            var ta = AssetDatabase.LoadAssetAtPath<TextAsset>(Root + "/Shots/" + id + ".json");
            return ta == null ? null : ShotData.FromJson(ta.text);
        }

        static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            var parent = Path.GetDirectoryName(path).Replace('\\', '/');
            EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent, Path.GetFileName(path));
        }
    }
}
