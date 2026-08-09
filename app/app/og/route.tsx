import { ImageResponse } from 'next/og'

export function GET(request: Request) {
  const url = new URL(request.url)
  const title = url.searchParams.get('title') || 'Krrisha Patel'
  const subtitle =
    url.searchParams.get('subtitle') || 'CS & Finance @ Penn M&T · SDE Intern @ AWS'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #3b0764 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 88, fontWeight: 700, color: '#f8fafc' }}>
          {title}
        </div>
        <div style={{ display: 'flex', marginTop: 24, fontSize: 36, color: '#c4b5fd' }}>
          {subtitle}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 56,
            height: 8,
            width: 220,
            borderRadius: 4,
            background: 'linear-gradient(90deg, #a78bfa 0%, #f472b6 100%)',
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
