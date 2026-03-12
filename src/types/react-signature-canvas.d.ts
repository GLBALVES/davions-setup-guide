declare module "react-signature-canvas" {
  import * as React from "react";

  interface SignatureCanvasProps {
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement> & { width?: number; height?: number };
    penColor?: string;
    velocityFilterWeight?: number;
    minWidth?: number;
    maxWidth?: number;
    minDistance?: number;
    dotSize?: number | (() => number);
    onBegin?: (event: MouseEvent | Touch) => void;
    onEnd?: (event: MouseEvent | Touch) => void;
    backgroundColor?: string;
    clearOnResize?: boolean;
  }

  class SignatureCanvas extends React.Component<SignatureCanvasProps> {
    clear(): void;
    isEmpty(): boolean;
    toDataURL(type?: string, encoderOptions?: number): string;
    fromDataURL(dataURL: string): void;
    toData(): Point[][];
    fromData(pointGroups: Point[][]): void;
    off(): void;
    on(): void;
  }

  interface Point {
    x: number;
    y: number;
    time: number;
  }

  export default SignatureCanvas;
}
