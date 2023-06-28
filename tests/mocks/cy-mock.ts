export const cyMock = () => {
  (global as any).cy = {
    window() {
      return {
        then: (callback: (w: any) => void) => callback(window),
      };
    },
  };
};
