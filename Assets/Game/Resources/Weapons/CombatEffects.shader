Shader "Diandian/CombatEffects"
{
    Properties
    {
        _Color ("Tint", Color) = (1, 1, 1, 1)
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" }
        Blend SrcAlpha OneMinusSrcAlpha
        Cull Off
        ZWrite Off

        Pass
        {
            CGPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #include "UnityCG.cginc"

            struct Input
            {
                float4 position : POSITION;
                fixed4 color : COLOR;
            };

            struct Interpolators
            {
                float4 position : SV_POSITION;
                fixed4 color : COLOR;
            };

            fixed4 _Color;

            Interpolators Vert(Input input)
            {
                Interpolators output;
                output.position = UnityObjectToClipPos(input.position);
                output.color = input.color * _Color;
                return output;
            }

            fixed4 Frag(Interpolators input) : SV_Target
            {
                return input.color;
            }
            ENDCG
        }
    }
}
