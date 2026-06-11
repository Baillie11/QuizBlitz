/**
 * Placeholder interstitial ad stub.
 *
 * TODO (Level 2): Replace with a real interstitial implementation.
 *   - For AdMob: use `react-native-google-mobile-ads` InterstitialAd
 *   - For AppLovin: use `react-native-applovin-max` MaxAds
 *
 * Usage:
 *   import AdInterstitial from '../components/AdInterstitial';
 *   // Before game ends or between game rounds:
 *   AdInterstitial.show(showAds);
 */
const AdInterstitial = {
  /**
   * Show a full-screen interstitial ad when enabled.
   * Currently a no-op placeholder.
   * @param {boolean} enabled – pass the `showAds` value from AuthContext
   */
  show(enabled) {
    if (!enabled) return;
    // TODO: load and present real interstitial here
    console.log('[AdInterstitial] TODO: Show interstitial ad');
  },
};

export default AdInterstitial;
