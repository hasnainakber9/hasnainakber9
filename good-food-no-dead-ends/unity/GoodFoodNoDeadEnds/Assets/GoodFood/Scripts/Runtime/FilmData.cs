using System;
using UnityEngine;

namespace GoodFood
{
    // Data written by film/export_unity.py. JsonUtility-friendly: flat arrays, no nulls.

    [Serializable]
    public class LightData
    {
        public string type;          // directional | hemisphere | ambient | point | spot
        public string color;         // sRGB hex
        public string sky;           // hemisphere only
        public string ground;        // hemisphere only
        public float intensity;
        public float[] dir;          // three.js world direction the light travels (directional, spot)
        public float[] pos;          // three.js world position (point, spot)
        public float range;
        public float angle;          // spot half-angle, radians
        public float penumbra;
        public bool shadows;
    }

    [Serializable]
    public class ShotData
    {
        public string id;
        public float start;          // seconds into the master edit
        public float duration;
        public int fps;
        public int frames;
        public string glb;
        public int camStride;        // 11: t, px, py, pz, qx, qy, qz, qw, vertical fov (deg), focus distance (m), film aperture
        public float[] cam;
        public float[] cuts;         // in-shot camera cuts, seconds from shot start
        public float near;
        public float far;
        public LightData[] lights;
        public bool hasFog;
        public string fogColor;
        public float fogNear;
        public float fogFar;
        public float exposure;
        public string envHdri;
        public float envIntensity;
        public float envRotationY;
        public float bloomStrength;
        public float bloomRadius;
        public float bloomThreshold;
        public float vignette;
        public float grain;
        public float warmth;
        public float sat;
        public float contrast;
        public float lift;

        public static ShotData FromJson(string json) { return JsonUtility.FromJson<ShotData>(json); }
    }

    [Serializable] public class EdlShot { public string id; public float start; public float duration; public string glb; }
    [Serializable] public class EdlLine { public string @char; public string text; public float start; public float end; public string clip; }
    [Serializable] public class EdlCaption { public float start; public float end; public string text; }
    [Serializable] public class EdlTitle { public string shot; public string line1; public string line2; public float line1At; public float line2At; public float loopAt; public string accent; public string background; public string text; }

    [Serializable]
    public class EditDecisionList
    {
        public string title;
        public int fps;
        public float duration;
        public int width;
        public int height;
        public EdlShot[] shots;
        public EdlLine[] dialogue;
        public EdlCaption[] captions;
        public EdlTitle titleCard;

        public static EditDecisionList FromJson(string json) { return JsonUtility.FromJson<EditDecisionList>(json); }

        public float ShotStart(string id)
        {
            if (shots != null) foreach (var s in shots) if (s.id == id) return s.start;
            return 0f;
        }
    }

    // The film was built in three.js (right-handed, cameras and lights look down -Z).
    // glTFast imports the GLBs by mirroring X, so camera and light data use the same mapping.
    public static class ThreeToUnity
    {
        public static Vector3 Position(float x, float y, float z) { return new Vector3(-x, y, z); }
        public static Vector3 Position(float[] p) { return p == null || p.Length < 3 ? Vector3.zero : Position(p[0], p[1], p[2]); }
        public static Vector3 Direction(float[] d) { return d == null || d.Length < 3 ? Vector3.down : new Vector3(-d[0], d[1], d[2]); }
        public static Quaternion Rotation(float x, float y, float z, float w) { return new Quaternion(x, -y, -z, w); }
        public static Quaternion CameraRotation(float x, float y, float z, float w) { return Rotation(x, y, z, w) * Quaternion.Euler(0f, 180f, 0f); }
        public static Color Hex(string hex, Color fallback)
        {
            Color c;
            return !string.IsNullOrEmpty(hex) && ColorUtility.TryParseHtmlString(hex, out c) ? c : fallback;
        }
    }
}
