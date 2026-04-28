import { Route, Routes } from 'react-router'

import './App.css'
import Home from './pages/Home'
import GenerateJSON from './pages/GenerateJSON'

const App: React.FC = () => {
  return (
    <div className='App'>
      <Routes>
        <Route index element={<Home />} />
        <Route path='/generatejson' element={<GenerateJSON />} />
      </Routes>
    </div>
  )
}

export default App
