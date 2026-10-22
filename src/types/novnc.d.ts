declare module '@novnc/novnc/lib/rfb' {
  export default class RFB extends EventTarget {
    constructor(
      target: HTMLElement,
      url: string,
      options?: { credentials?: { password: string } }
    );
    viewOnly: boolean;
    scaleViewport: boolean;
    resizeSession: boolean;
    getImageData(): ImageData;
    disconnect(): void;
    sendCredentials(credentials: { password: string }): void;
  }
}
