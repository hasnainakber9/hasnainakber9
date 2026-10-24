using UnityEngine;
using UnityEngine.Rendering.Universal;

namespace GoodFood
{
    // Animated focus pull exported from the film's camera rig. The camera clip animates these two fields;
    // in Play Mode they drive URP Bokeh depth of field on the global Volume.
    [ExecuteAlways]
    [RequireComponent(typeof(Camera))]
    public class ShotFocus : MonoBehaviour
    {
        public float focusDistance = 3f;
        [Tooltip("Aperture value from the film's BokehPass, mapped to an f-stop (0.002 = f/8, 0.008 = f/1.8).")]
        public float filmAperture = 0.004f;

        Camera cam;

        void LateUpdate()
        {
            if (!Application.isPlaying) return;
            if (cam == null) cam = GetComponent<Camera>();
            var volume = FilmVolume.Get();
            DepthOfField dof;
            if (volume == null || !volume.profile.TryGet(out dof)) return;
            dof.mode.Override(DepthOfFieldMode.Bokeh);
            dof.focusDistance.Override(Mathf.Max(0.1f, focusDistance));
            // 35 mm full-frame equivalent focal length from the vertical field of view (24 mm sensor height)
            dof.focalLength.Override(Mathf.Clamp(12f / Mathf.Tan(cam.fieldOfView * 0.5f * Mathf.Deg2Rad), 10f, 300f));
            dof.aperture.Override(Mathf.Lerp(8f, 1.8f, Mathf.InverseLerp(0.002f, 0.008f, filmAperture)));
        }
    }
}
