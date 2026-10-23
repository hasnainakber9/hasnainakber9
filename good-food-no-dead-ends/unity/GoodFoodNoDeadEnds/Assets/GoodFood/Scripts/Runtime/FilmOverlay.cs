using UnityEngine;
using UnityEngine.Playables;

namespace GoodFood
{
    // Captions and the end title card, driven by the master PlayableDirector's time, so they also show while scrubbing.
    // Text elements are TextMeshProUGUI; legacy UnityEngine.UI.Text is accepted as a fallback.
    [ExecuteAlways]
    public class FilmOverlay : MonoBehaviour
    {
        public PlayableDirector director;
        public TextAsset editDecisionList;
        public bool showCaptions = true;
        [Tooltip("TextMeshProUGUI (or a legacy Text fallback) that shows the current caption.")]
        public UnityEngine.UI.Graphic caption;
        public CanvasGroup title;
        public RectTransform line1;
        public RectTransform line2;
        public float line1Y = 66f;
        public float line2Y = -66f;
        public UnityEngine.UI.Image loop;

        EditDecisionList edl;
        string loadedText;
        CanvasGroup line1Group, line2Group;

        void LateUpdate()
        {
            if (director == null || editDecisionList == null) return;
            if (edl == null || loadedText != editDecisionList.text) { edl = EditDecisionList.FromJson(editDecisionList.text); loadedText = editDecisionList.text; }
            float t = (float)director.time;

            if (caption != null)
            {
                string text = "";
                if (showCaptions && edl.captions != null)
                    foreach (var c in edl.captions) if (t >= c.start && t < c.end) { text = c.text; break; }
                SetText(caption, text);
            }

            if (title != null && edl.titleCard != null)
            {
                float u = t - edl.ShotStart(edl.titleCard.shot);
                title.alpha = u >= 0f ? 1f : 0f;
                if (line1Group == null && line1 != null) line1Group = line1.GetComponent<CanvasGroup>();
                if (line2Group == null && line2 != null) line2Group = line2.GetComponent<CanvasGroup>();
                Rise(line1, line1Group, line1Y, u - edl.titleCard.line1At);
                Rise(line2, line2Group, line2Y, u - edl.titleCard.line2At);
                if (loop != null)
                {
                    loop.fillAmount = Mathf.Clamp01(EaseInOut(Mathf.Clamp01((u - edl.titleCard.loopAt) / 2.2f)) * 0.98f);
                    var c = loop.color; c.a = 0.55f * Mathf.Clamp01((u - edl.titleCard.loopAt) / 1.4f); loop.color = c;
                }
            }
        }

        // only touch the text when it changes, so the mesh is not rebuilt every frame
        static void SetText(UnityEngine.UI.Graphic g, string s)
        {
            var tmp = g as TMPro.TMP_Text;
            if (tmp != null) { if (tmp.text != s) tmp.text = s; return; }
            var legacy = g as UnityEngine.UI.Text;
            if (legacy != null && legacy.text != s) legacy.text = s;
        }

        static float EaseOut(float x) { return 1f - Mathf.Pow(1f - x, 3f); }
        static float EaseInOut(float x) { return x < 0.5f ? 4f * x * x * x : 1f - Mathf.Pow(-2f * x + 2f, 3f) / 2f; }

        // the CSS "rise" of the film's title card: fade in while sliding up 1.2 vmin over 0.9 s
        static void Rise(RectTransform rt, CanvasGroup g, float baseY, float u)
        {
            if (rt == null) return;
            float k = EaseOut(Mathf.Clamp01(u / 0.9f));
            rt.anchoredPosition = new Vector2(0f, baseY - (1f - k) * 13f);
            if (g != null) g.alpha = u <= 0f ? 0f : k;
        }
    }
}
