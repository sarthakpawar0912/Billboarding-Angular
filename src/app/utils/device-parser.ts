import { DeviceInfo } from '../models/security.model';

/**
 * Utility class for parsing user agent strings and extracting device information
 */
export class DeviceParser {
  /**
   * Parse user agent string to extract browser, OS, and device information
   * @param userAgent The user agent string from the login entry
   * @returns DeviceInfo object with parsed details
   */
  static parse(userAgent: string): DeviceInfo {
    const ua = userAgent.toLowerCase();

    // Browser detection
    let browser = 'Unknown Browser';
    let browserVersion = '';

    if (ua.includes('edg/')) {
      browser = 'Edge';
      browserVersion = this.extractVersion(ua, 'edg/');
    } else if (ua.includes('chrome/') && !ua.includes('edg')) {
      browser = 'Chrome';
      browserVersion = this.extractVersion(ua, 'chrome/');
    } else if (ua.includes('firefox/')) {
      browser = 'Firefox';
      browserVersion = this.extractVersion(ua, 'firefox/');
    } else if (ua.includes('safari/') && !ua.includes('chrome')) {
      browser = 'Safari';
      browserVersion = this.extractVersion(ua, 'version/');
    } else if (ua.includes('opera') || ua.includes('opr/')) {
      browser = 'Opera';
      browserVersion = this.extractVersion(ua, 'opr/');
    } else if (ua.includes('msie') || ua.includes('trident/')) {
      browser = 'Internet Explorer';
      browserVersion = this.extractVersion(ua, 'msie ') || this.extractVersion(ua, 'rv:');
    }

    // OS detection
    let os = 'Unknown OS';
    let osVersion = '';

    if (ua.includes('windows')) {
      os = 'Windows';
      if (ua.includes('windows nt 10.0')) osVersion = '10/11';
      else if (ua.includes('windows nt 6.3')) osVersion = '8.1';
      else if (ua.includes('windows nt 6.2')) osVersion = '8';
      else if (ua.includes('windows nt 6.1')) osVersion = '7';
      else if (ua.includes('windows nt 6.0')) osVersion = 'Vista';
      else if (ua.includes('windows nt 5.1')) osVersion = 'XP';
    } else if (ua.includes('mac os x')) {
      os = 'macOS';
      osVersion = this.extractVersion(ua, 'mac os x ').replace(/_/g, '.');
    } else if (ua.includes('linux')) {
      os = 'Linux';
      if (ua.includes('ubuntu')) osVersion = 'Ubuntu';
      else if (ua.includes('fedora')) osVersion = 'Fedora';
      else if (ua.includes('debian')) osVersion = 'Debian';
    } else if (ua.includes('android')) {
      os = 'Android';
      osVersion = this.extractVersion(ua, 'android ');
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      os = ua.includes('ipad') ? 'iPadOS' : 'iOS';
      osVersion = this.extractVersion(ua, 'os ').replace(/_/g, '.');
    } else if (ua.includes('cros')) {
      os = 'Chrome OS';
    }

    // Device type detection
    let device: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown' = 'Unknown';

    if (ua.includes('mobile') || ua.includes('iphone')) {
      device = 'Mobile';
    } else if (ua.includes('ipad') || ua.includes('tablet')) {
      device = 'Tablet';
    } else if (ua.includes('windows') || ua.includes('mac os') || ua.includes('linux') || ua.includes('cros')) {
      device = 'Desktop';
    }

    return {
      browser,
      browserVersion,
      os,
      osVersion,
      device
    };
  }

  /**
   * Extract version number from user agent string
   * @param ua The user agent string (lowercased)
   * @param prefix The prefix before the version number
   * @returns The extracted version number (major version only)
   */
  private static extractVersion(ua: string, prefix: string): string {
    const index = ua.indexOf(prefix);
    if (index === -1) return '';

    const versionStart = index + prefix.length;
    const versionEnd = ua.indexOf(' ', versionStart);
    const version = ua.substring(versionStart, versionEnd === -1 ? undefined : versionEnd);

    // Return major version only
    const majorVersion = version.split('.')[0];
    return majorVersion || '';
  }

  /**
   * Get icon/emoji for device type
   * @param device The device type
   * @returns Emoji representing the device
   */
  static getDeviceIcon(device: string): string {
    const icons: Record<string, string> = {
      'Desktop': '💻',
      'Mobile': '📱',
      'Tablet': '📱',
      'Unknown': '❓'
    };
    return icons[device] || icons['Unknown'];
  }

  /**
   * Get icon/emoji for browser
   * @param browser The browser name
   * @returns Emoji representing the browser
   */
  static getBrowserIcon(browser: string): string {
    const icons: Record<string, string> = {
      'Chrome': '🌐',
      'Firefox': '🦊',
      'Safari': '🧭',
      'Edge': '🌊',
      'Opera': '🎭',
      'Internet Explorer': '⚠️',
      'Unknown Browser': '❓'
    };
    return icons[browser] || icons['Unknown Browser'];
  }

  /**
   * Get human-readable device display name
   * @param deviceInfo The parsed device information
   * @returns Formatted device string
   */
  static getDeviceDisplay(deviceInfo: DeviceInfo): string {
    const parts: string[] = [];

    if (deviceInfo.device !== 'Unknown') {
      parts.push(deviceInfo.device);
    }

    if (deviceInfo.os !== 'Unknown OS') {
      parts.push(deviceInfo.os);
      if (deviceInfo.osVersion) {
        parts.push(deviceInfo.osVersion);
      }
    }

    return parts.join(' · ') || 'Unknown Device';
  }

  /**
   * Get human-readable browser display name
   * @param deviceInfo The parsed device information
   * @returns Formatted browser string
   */
  static getBrowserDisplay(deviceInfo: DeviceInfo): string {
    if (deviceInfo.browser === 'Unknown Browser') {
      return 'Unknown Browser';
    }

    if (deviceInfo.browserVersion) {
      return `${deviceInfo.browser} ${deviceInfo.browserVersion}`;
    }

    return deviceInfo.browser;
  }
}
