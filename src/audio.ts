// minimal utility for formatting time
export const formatTime = (time: number) => {
  const seconds = Math.floor(time)
  const milliseconds = Math.floor((time - seconds) * 60)
  return `${seconds.toString().padStart(2, '0')}.${milliseconds
    .toString()
    .padStart(2, '0')}`
}
