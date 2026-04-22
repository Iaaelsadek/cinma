/**
 * 🚫 نظام إخفاء الإعلانات - فور سيما
 * Ad Neutralization System
 * 
 * @description نظام لإخفاء الإعلانات المنبثقة من سيرفرات المحتوى
 * @author 4Cima Team
 * @version 1.0.0
 */

/**
 * JavaScript code to inject into iframes to neutralize ads
 * This code:
 * 1. Overrides window.open to capture popup URLs and load them in hidden iframes
 * 2. Blocks new-tab anchor clicks (<a target="_blank">)
 * 3. Suppresses alert/confirm/prompt dialogs from ad scripts
 */
export const AD_NEUTRALIZER_JS = `
(function() {
  // 1. Override window.open — capture popup URL, load it in a hidden iframe, destroy after 2s
  var _origOpen = window.open;
  window.open = function(url, name, features) {
    try {
      if (url && typeof url === 'string') {
        var ghost = document.createElement('iframe');
        ghost.src = url;
        ghost.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-9999;top:-9999px;left:-9999px;';
        document.body.appendChild(ghost);
        setTimeout(function() {
          try { document.body.removeChild(ghost); } catch (e: any) {}
        }, 2000);
      }
    } catch (e: any) {}
    // Return a fake window object so the server thinks the popup opened
    return {
      closed: false, focus: function(){}, blur: function(){},
      close: function(){ this.closed = true; },
      location: { href: url || '' },
      document: { write: function(){}, close: function(){} }
    };
  };

  // 2. Block new-tab anchor clicks (<a target="_blank">)
  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (el && el.tagName === 'A' && el.target === '_blank') {
      e.preventDefault();
      e.stopPropagation();
      // Fire a ghost fetch so the ad server registers the hit
      try {
        var href = el.href;
        if (href && !href.startsWith('javascript')) {
          var img = new Image();
          img.src = href;
          setTimeout(function(){ img.src = ''; }, 2000);
        }
      } catch (e2: any) {}
    }
  }, true);

  // 3. Suppress alert/confirm/prompt dialogs from ad scripts
  window.alert   = function(){};
  window.confirm = function(){ return true; };
  window.prompt  = function(){ return ''; };

  true; // required for injectedJavaScript
})();
`;

/**
 * AdNeutralizer Class
 * Manages ad neutralization for video player iframes
 */
export class AdNeutralizer {
  private ghostIframes: Set<HTMLIFrameElement> = new Set();

  /**
   * Create a ghost iframe to load ad URL invisibly
   * @param url - The ad URL to load
   */
  private createGhostIframe(url: string): void {
    try {
      const ghost = document.createElement('iframe');
      ghost.src = url;
      ghost.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-9999;top:-9999px;left:-9999px;';
      document.body.appendChild(ghost);
      this.ghostIframes.add(ghost);

      // Auto-destroy after 2 seconds
      setTimeout(() => {
        try {
          document.body.removeChild(ghost);
          this.ghostIframes.delete(ghost);
        } catch {
          // Ignore errors if already removed
        }
      }, 2000);
    } catch {
    }
  }

  /**
   * Inject ad neutralization script into an iframe
   * @param iframe - The iframe element to inject the script into
   */
  public injectIntoIframe(iframe: HTMLIFrameElement): void {
    try {
      if (!iframe.contentWindow) {return;}

      // Wait for iframe to load
      iframe.addEventListener('load', () => {
        try {
          const script = iframe.contentWindow?.document.createElement('script');
          if (script) {
            script.textContent = AD_NEUTRALIZER_JS;
            iframe.contentWindow?.document.head.appendChild(script);
          }
        } catch {
          // Cross-origin iframes will throw errors - this is expected
        }
      });
    } catch {
    }
  }

  /**
   * Clean up all ghost iframes
   */
  public cleanup(): void {
    this.ghostIframes.forEach(ghost => {
      try {
        document.body.removeChild(ghost);
      } catch {
        // Ignore errors
      }
    });
    this.ghostIframes.clear();
  }
}

// Singleton instance
export const adNeutralizer = new AdNeutralizer();

export default adNeutralizer;
