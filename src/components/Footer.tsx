export interface FooterProps {}

export function Footer({}: FooterProps) {
  const year = new Date().getFullYear()
  return (
    <footer className='p-4 text-center'>
      Copyright University of Luxembourg {year}
    </footer>
  )
}
