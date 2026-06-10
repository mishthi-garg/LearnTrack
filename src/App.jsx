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

      <div className="min-h-screen bg-[rgb(234,224,207)]">
        <div className="bg-[rgb(32,41,64)] shadow-sm px-6 py-4 relative flex items-center justify-between">
          <NavLink 
          to="/"
          className="text-xl font-bold text-[rgb(255,222,66)]">
            LearnTrack
          </NavLink>
         
            <nav className="absolute left-1/2 -translate-x-1/2 flex gap-6">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? "font-semibold text-[rgb(238,238,238)]" : "text-[rgb(221,221,221)]"
                }
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/timetable"
                className={({ isActive }) =>
                  isActive ? "font-semibold text-[rgb(238,238,238)]" : "text-[rgb(221,221,221)]"
                }
              >
                Timetable
              </NavLink>

              <NavLink
                to="/tutor"
                className={({ isActive }) =>
                  isActive ? "font-semibold text-[rgb(238,238,238)]" : "text-[rgb(221,221,221)]"
                }
              >
                Tutor
              </NavLink>

              <NavLink
                to="/predict"
                className={({ isActive }) =>
                  isActive ? "font-semibold text-[rgb(238,238,238)]" : "text-[rgb(221,221,221)]"
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
                    isActive ? "font-semibold text-[rgb(238,238,238)]" : "text-[rgb(221,221,221)]"
                  }
                >
                  PROFILE
                </NavLink>
                {
                  isHovered && (
                    <div className="absolute flex flex-col gap-2 right-0 top-8 bg-[rgb(238,238,238)] border border-[rgb(75,64,56)] rounded-xl shadow-lg py-2 px-6 min-w-max">
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