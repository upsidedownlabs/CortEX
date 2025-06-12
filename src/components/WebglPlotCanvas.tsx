// components/WebglPlotCanvas.tsx
'use client'
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { WebglPlot, WebglLine, ColorRGBA } from 'webgl-plot'


export type WebglPlotCanvasHandle = {
  /** Get the WebGL context */
  getContext: () => WebGLRenderingContext | null
  /** Get the current WebglPlot instance */
  getPlot: () => WebglPlot | null
  /** Force a redraw of the plot */
  redraw: () => void
  /** Get the canvas element */
  getCanvas: () => HTMLCanvasElement | null

  updateData: (channeldata: number[]) => void 
  gridnumber:number
}

function hexToColorRGBA(hex: string): ColorRGBA {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return new ColorRGBA(r, g, b, 1)
}

// Define the Props type
type Props = {

  channels: number[]
  colors: Record<number, string>
  gridnumber: number
 
}

 const WebglPlotCanvas = forwardRef<WebglPlotCanvasHandle, Props>(
  ({ channels, colors,gridnumber }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const wglpRef = useRef<WebglPlot | null>(null)
    const linesRef = useRef<Record<string, WebglLine>>({})
    const sweepRef = useRef(0)
    const containerRef = useRef<HTMLDivElement>(null)
       // Constants (could be props if needed)
       const samplingRate = 500;
       const selectedBits = 10;
       const theme = 'dark';
       const gridCreatedRef = useRef(false);// Track if grid has been created

    // Create grid lines (only once)
    const createGridLines = () => {
      if (!containerRef.current || gridCreatedRef.current) return
      gridCreatedRef.current = true

      const canvasWrapper = document.createElement("div")
      canvasWrapper.className = "grid-lines-wrapper absolute inset-0 pointer-events-none"

      const opacityDarkMajor = "0.2"
      const opacityDarkMinor = "0.05"
      const opacityLightMajor = "0.4"
      const opacityLightMinor = "0.1"
      const distanceminor = samplingRate * 0.04
      const numGridLines = (Math.pow(2, selectedBits) * 4 / distanceminor)

      // Vertical lines
      for (let j = 1; j < numGridLines; j++) {
        const gridLineX = document.createElement("div")
        gridLineX.className = "absolute bg-[rgb(128,128,128)]"
        gridLineX.style.width = "1px"
        gridLineX.style.height = "100%"
        gridLineX.style.left = `${((j / numGridLines) * 100).toFixed(3)}%`
        gridLineX.style.opacity = j % 5 === 0
          ? (theme === "dark" ? opacityDarkMajor : opacityLightMajor)
          : (theme === "dark" ? opacityDarkMinor : opacityLightMinor)
        canvasWrapper.appendChild(gridLineX)
      }

      // Horizontal lines
      for (let j = 1; j < gridnumber; j++) {
        const gridLineY = document.createElement("div")
        gridLineY.className = "absolute bg-[rgb(128,128,128)]"
        gridLineY.style.height = "1px"
        gridLineY.style.width = "100%"
        gridLineY.style.top = `${((j / gridnumber) * 100).toFixed(3)}%`
        gridLineY.style.opacity = j % 5 === 0
          ? (theme === "dark" ? opacityDarkMajor : opacityLightMajor)
          : (theme === "dark" ? opacityDarkMinor : opacityLightMinor)
        canvasWrapper.appendChild(gridLineY)
      }

      containerRef.current.appendChild(canvasWrapper)
    }
    createGridLines();
    useImperativeHandle(
      ref,
      () => ({
        getContext: () => canvasRef.current?.getContext('webgl') || null,
        getPlot: () => wglpRef.current,
        redraw: () => wglpRef.current?.update(),
        getCanvas: () => canvasRef.current,
        updateData: (channeldata: number[]) => {
          const ch = channels[0]; // use correct channel key
          const line = linesRef.current[ch];
          const n = line?.numPoints ?? 0;
          if (!line || n === 0) return;

          const idx = sweepRef.current;

          const val = channeldata[1]; // Adjust if your data format is different

          line.setY(idx, val);

          sweepRef.current = (idx + 1) % n;

          wglpRef.current?.update();
        },
        gridnumber:gridnumber
      }),
      [channels] // should depend on channels
    )



    // Initialize WebGL plot and lines
    const initWebglPlot = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Set initial canvas size
      const { width, height } = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr

      // Create WebGL plot
      const wglp = new WebglPlot(canvas)
      wglpRef.current = wglp
      linesRef.current = {}

      // Create lines for each channel
      channels.forEach((ch: number) => {
        const line = new WebglLine(hexToColorRGBA(colors[ch]), 2000)
        line.lineSpaceX(-1, 2 / 2000)
        
        // Initialize with some default data (sin wave for example)
        for (let i = 0; i < line.numPoints; i++) {
          const x = (i / line.numPoints) * 4 * Math.PI
          line.setY(i, Math.sin(x) * 0.8)
        }

        linesRef.current[ch] = line
        wglp.addLine(line)
      })

      wglp.update()
      sweepRef.current = 0
      createGridLines()
    }
   useEffect(() => {
            const handleResize = () => {
                createGridLines();
                initWebglPlot();

            };
            window.addEventListener("resize", handleResize);
            return () => {
                window.removeEventListener("resize", handleResize);
            };
        }, [createGridLines,initWebglPlot]);
    // 1) Initial setup effect
    useEffect(() => {
      initWebglPlot()

      // 2) Resize observer for responsive sizing
      const canvas = canvasRef.current
      if (!canvas) return

      const onResize = () => {
        const { width, height } = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        canvas.width = width * dpr
        canvas.height = height * dpr
        wglpRef.current?.update()
      }

      const ro = new ResizeObserver(onResize)
      ro.observe(canvas)
      onResize() // Initial sizing

      return () => {
        ro.disconnect()
        wglpRef.current = null
        linesRef.current = {}
      }
    }, []) // Empty dependency array means this runs once on mount

    return (
      <div ref={containerRef} className="relative w-full h-full">

      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
            </div>

    )
  }
)

WebglPlotCanvas.displayName = 'WebglPlotCanvas'

export default WebglPlotCanvas