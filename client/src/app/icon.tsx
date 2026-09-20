import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(140deg, #13A272, #0A6B4C)',
          borderRadius: '25%',
        }}
      >
        <div
          style={{
            width: '30%',
            height: '30%',
            backgroundColor: '#EAFBF3',
            borderRadius: '15%',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
