import { Route, Routes } from 'react-router'

import './App.css'
import Home from './pages/Home'
import GenerateJSON from './pages/GenerateJSON'
import { Footer } from './components/Footer'

const App: React.FC = () => {
  return (
    <div className='App'>
      <Routes>
        <Route index element={<Home />} />
        <Route path='/generatesoundscape' element={<GenerateJSON />} />
      </Routes>
      <Footer />
    </div>
  )
}

export default App
