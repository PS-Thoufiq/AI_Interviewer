import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TechSelection from './TechSelection';
import Interview from './Interview';


function App() {

  return (
    <>
      <div>
          <BrowserRouter>
      <Routes>
        <Route path="/" element={<TechSelection />} />
        <Route path="/interview" element={<Interview />} />
      </Routes>
    </BrowserRouter>
       </div>
    </>
  )
}

export default App
