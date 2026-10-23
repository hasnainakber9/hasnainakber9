using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.UI;

namespace GoodFood
{
    // Captions and the end title card, driven by the master PlayableDirector's time, so they also show while scrubbing.
    [ExecuteAlways]
    public class FilmOverlay : MonoBehaviour
    {
        public PlayableDirector director;
        public TextAsset editDecisionList;
        public bool showCaptions = true;
        public Text caption;
        public CanvasGroup title;
        public RectTransform line1;
        public RectTransform line2;
        public float line1Y = 66f;
        public float line2Y = -66f;
        public Image loop;

        EditDecisionList edl;
        string loadedText;

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
                caption.text = text;
            }

            if (title != null && edl.titleCard != null)
            {
                float u = t - edl.ShotStart(edl.titleCard.shot);
                title.alpha = u >= 0f ? 1f : 0f;
                Rise(line1, line1Y, u - edl.titleCard.line1At);
                Rise(line2, line2Y, u - edl.titleCard.line2At);
                if (loop != null)
                {
                    loop.fillAmount = Mathf.Clamp01(EaseInOut(Mathf.Clamp01((u - edl.titleCard.loopAt) / 2.2f)) * 0.98f);
                    var c = loop.color; c.a = 0.55f * Mathf.Clamp01((u - edl.titleCard.loopAt) / 1.4f); loop.color = c;
                }
            }
        }

        static float EaseOut(float x) { return 1f - Mathf.Pow(1f - x, 3f); }
        static float EaseInOut(float x) { return x < 0.5f ? 4f * x * x * x : 1f - Mathf.Pow(-2f * x + 2f, 3f) / 2f; }

        // the CSS "rise": fade in while sliding up 1.2 vmin over 0.9 s
        static void Rise(RectTransform rt, float baseY, float u)
        {
            if (rt == null) return;
            float k = EaseOut(Mathf.Clamp01(u / 0.9f));
            rt.anchoredPosition = new Vector2(0f, baseY - (1f - k) * 13f);
            var g = rt.GetComponent<CanvasGroup>();
            if (g != null) g.alpha = u <= 0f ? 0f : k;
        }
    }
}
