import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Predict from './pages/Predict'
import Profile from './pages/Profile'
import Timetable from './pages/Timetable'
import Tutor from './pages/Tutor'
import { useState } from 'react'

function App() {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <BrowserRouter>

      <div className="min-h-screen bg-yellow-50">
        <div className="bg-white shadow-sm px-6 py-4 relative flex items-center justify-between">
          <NavLink 
          to="/"
          className="text-xl font-bold text-green-600">
            LearnTrack
          </NavLink>
         
            <nav className="absolute left-1/2 -translate-x-1/2 flex gap-6">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? "text-blue-600 font-semibold" : "text-gray-600 hover:text-blue-600"
                }
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/timetable"
                className={({ isActive }) =>
                  isActive ? "text-blue-600 font-semibold" : "text-gray-600 hover:text-blue-600"
                }
              >
                Timetable
              </NavLink>

              <NavLink
                to="/tutor"
                className={({ isActive }) =>
                  isActive ? "text-blue-600 font-semibold" : "text-gray-600 hover:text-blue-600"
                }
              >
                Tutor
              </NavLink>

              <NavLink
                to="/predict"
                className={({ isActive }) =>
                  isActive ? "text-blue-600 font-semibold" : "text-gray-600 hover:text-blue-600"
                }
              >
                Predict
              </NavLink>

            </nav>

          <div
            className="relative"
            onMouseEnter={()=>setIsHovered(true)}
            onMouseLeave={()=>setIsHovered(false)}
          >
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    isActive ? "text-blue-600 font-semibold" : "text-gray-600 hover:text-blue-600"
                  }
                >
                  PROFILE
                </NavLink>
                {
                  isHovered && (
                    <div className="absolute flex flex-col gap-2 right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg py-2 px-6 min-w-max">
                      <p className="font-bold">Mishthi Garg</p>
                      <p>24UCC126</p>
                    </div>
                  )
                }
          </div>
          
        </div>
        <div className="p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/predict" element={<Predict />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/tutor" element={<Tutor />} />
            </Routes>
          </div>
      </div>
    </BrowserRouter>
  )
}

export default App;