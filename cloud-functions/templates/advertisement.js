export function getAdvertisement() {
  return `<aside class="installation-ad" aria-label="广告">
    <span class="ad-label">广告</span>
    <!-- Homebrew CN -->
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="ca-pub-8322854923336162"
         data-ad-slot="8185043472"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
    <script>
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.warn('Homebrew CN 广告初始化失败', error);
      }
    </script>
  </aside>`;
}
