type Props = {
  size?: number
  color?: string
}

export default function Pin({ size = 30, color = '#ff7a00' }: Props) {
  return (
    <svg
      height={size}
      viewBox="0 0 24 24"
      style={{
        fill: color,
        stroke: '#fff',
        strokeWidth: 1,
        cursor: 'pointer',
        transform: `translate(${-size / 2}px,${-size}px)`,
      }}
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  )
}
