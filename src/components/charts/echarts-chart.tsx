import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import type { EChartsCoreOption, EChartsType } from 'echarts/core'

type EChartsChartProps = {
  'aria-label': string
  className?: string
  option: EChartsCoreOption
  style: React.CSSProperties
}

export function EChartsChart({ 'aria-label': ariaLabel, className, option, style }: EChartsChartProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<EChartsType | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const chart = echarts.init(element)
    instanceRef.current = chart
    chart.setOption(option)

    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(element)

    return () => {
      observer.disconnect()
      chart.dispose()
      instanceRef.current = null
    }
  }, [option])

  return <div aria-label={ariaLabel} className={className} ref={elementRef} role="img" style={style} />
}
