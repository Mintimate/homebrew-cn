export function getAdvertisement() {
  return `<aside class="installation-ad" data-ad-state="pending" aria-label="广告">
    <span class="ad-label">广告</span>
    <!-- Homebrew CN -->
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="ca-pub-8322854923336162"
         data-ad-slot="8185043472"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
    <script>
      (() => {
        const container = document.currentScript.closest('.installation-ad');
        const ad = container.querySelector('.adsbygoogle');
        const loader = document.getElementById('adsense-loader');
        let timeout;

        function collapse() {
          container.dataset.adState = 'unavailable';
          clearTimeout(timeout);
        }

        function updateStatus() {
          const status = ad.getAttribute('data-ad-status');
          if (status === 'filled') {
            clearTimeout(timeout);
            container.dataset.adState = 'filled';
          } else if (status === 'unfilled' || status === 'unfill-optimized') {
            collapse();
          }
        }

        // Keep observing so a late response can restore an ad after a timeout.
        const observer = new MutationObserver(updateStatus);
        observer.observe(ad, { attributes: true, attributeFilter: ['data-ad-status'] });
        timeout = setTimeout(collapse, 8000);

        // The async loader may have failed before this part of the page was parsed.
        if (!loader || loader.dataset.loadFailed === 'true') {
          collapse();
          return;
        }
        loader.addEventListener('error', collapse, { once: true });
        updateStatus();

        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (error) {
          collapse();
          console.warn('Homebrew CN 广告初始化失败', error);
        }
      })();
    </script>
  </aside>`;
}
