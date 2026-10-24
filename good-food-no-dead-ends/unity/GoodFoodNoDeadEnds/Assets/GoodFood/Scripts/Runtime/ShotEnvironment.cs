using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace GoodFood
{
    // One shot's sky, ambient light, fog, reflections and grade. Applied whenever the shot is switched on
    // (the master Timeline activates one shot at a time), including while scrubbing in the Editor.
    [ExecuteAlways]
    public class ShotEnvironment : MonoBehaviour
    {
        public Material skybox;
        public Texture reflection;
        public Light sun;
        public Color ambientSky = new Color(0.55f, 0.6f, 0.7f);
        public Color ambientEquator = new Color(0.5f, 0.48f, 0.45f);
        public Color ambientGround = new Color(0.4f, 0.35f, 0.3f);
        public bool fog;
        public Color fogColor = Color.gray;
        public float fogStart = 40f;
        public float fogEnd = 260f;

        [Header("Grade, written to the global Volume in Play Mode")]
        public float postExposure;
        public float saturation;
        public float contrast;
        public float temperature;
        public float bloomIntensity = 0.3f;
        public float bloomThreshold = 0.9f;
        public float vignette = 0.3f;
        public float grain = 0.2f;

        void OnEnable() { Apply(); }

        public void Apply()
        {
            if (skybox != null) RenderSettings.skybox = skybox;
            if (sun != null) RenderSettings.sun = sun;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = ambientSky;
            RenderSettings.ambientEquatorColor = ambientEquator;
            RenderSettings.ambientGroundColor = ambientGround;
            RenderSettings.fog = fog;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogColor = fogColor;
            RenderSettings.fogStartDistance = fogStart;
            RenderSettings.fogEndDistance = fogEnd;
            if (reflection != null)
            {
                RenderSettings.defaultReflectionMode = DefaultReflectionMode.Custom;
                RenderSettings.customReflectionTexture = reflection;
            }
            DynamicGI.UpdateEnvironment();

            if (!Application.isPlaying) return;      // keep the shared Volume asset untouched in Edit Mode
            var volume = FilmVolume.Get();
            if (volume == null) return;
            var profile = volume.profile;
            ColorAdjustments ca; WhiteBalance wb; Bloom bloom; Vignette vig; FilmGrain fg;
            if (profile.TryGet(out ca)) { ca.postExposure.Override(postExposure); ca.saturation.Override(saturation); ca.contrast.Override(contrast); }
            if (profile.TryGet(out wb)) wb.temperature.Override(temperature);
            if (profile.TryGet(out bloom)) { bloom.intensity.Override(bloomIntensity); bloom.threshold.Override(bloomThreshold); }
            if (profile.TryGet(out vig)) vig.intensity.Override(vignette);
            if (profile.TryGet(out fg)) fg.intensity.Override(grain);
        }
    }

    public static class FilmVolume
    {
        static Volume cached;
        public static Volume Get()
        {
            if (cached == null) cached = Object.FindFirstObjectByType<Volume>();
            return cached;
        }
    }
}
