export interface DisplayOptions {
  showGrid: boolean;
  showPriceScale: boolean;
  showTimeScale: boolean;
  showVolume: boolean;
  showStudies: boolean;
  showToolbar: boolean;
}

export const DEFAULT_DISPLAY_OPTIONS: DisplayOptions = {
  showGrid: false,
  showPriceScale: true,
  showTimeScale: true,
  showVolume: false,
  showStudies: false,
  showToolbar: false,
};
