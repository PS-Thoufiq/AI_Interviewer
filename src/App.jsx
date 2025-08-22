import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TechSelection from './TechSelection';
import Interview from './Interview';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Admin from './Admin';


function App() {

  return (
    <>
      <div>
        <ToastContainer
        position="top-left"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
          <BrowserRouter>
      <Routes>
        <Route path="/" element={<TechSelection />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
       </div>
    </>
  )
}

export default App
