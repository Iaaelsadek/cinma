import ReactPlayer from 'react-player'

export const VideoPlayer = ({ url }: { url: string }) => {
  return (
    <ReactPlayer
      url={url}
      width="100%"
      height="100%"
      controls
      config={{ file: { attributes: { crossOrigin: 'anonymous' } } }}
    />
  )
}
