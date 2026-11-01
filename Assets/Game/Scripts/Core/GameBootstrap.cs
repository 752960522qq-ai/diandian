using UnityEngine;

namespace Diandian
{
    public sealed class GameBootstrap : MonoBehaviour
    {
        private void Awake()
        {
            Application.targetFrameRate = 120;
            gameObject.AddComponent<GameSession>().Initialize();
        }
    }
}
