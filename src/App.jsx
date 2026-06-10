import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Predict from './pages/Predict'
import Profile from './pages/Profile'
import Timetable from './pages/Timetable'
import Tutor from './pages/Tutor'
import AuthPage from './pages/AuthPage'
import ProtectedRoute from './components/ProtectedRoute'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [isHovered, setIsHovered] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    })

    const {data: { subscription }} = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if(event === 'SIGNED_OUT' || event==='SIGNED_IN' ){
        setLogoutLoading(false);
      }
    })

  

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    await supabase.auth.signOut();
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[rgb(234,224,207)] flex items-center justify-center">
        <p className="text-[rgb(75,64,56)] font-semibold">Loading...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>

      <div className="min-h-screen bg-[rgb(234,224,207)]">

        {
          user && (

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
              <div className="flex items-center gap-4">
                <div
                  className="relative"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
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
                      <div className="absolute flex flex-col gap-2 right-0 top-6 bg-[rgb(238,238,238)] border border-[rgb(75,64,56)] rounded-xl shadow-lg py-2 px-6 min-w-max items-start">
                        <p className="font-bold">Mishthi Garg</p>

                        <p>{user.email}</p>
                        <NavLink
                          to="/profile"
                          className="text-sm w-full hover:underline"
                        >
                          Edit Profile
                        </NavLink>
                        <button
                          onClick={handleLogout}
                          disabled={logoutLoading}
                          className="disabled:opacity-50 cursor-pointer w-full text-sm bg-[rgb(75,86,148)] text-white font-bold px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)]"
                        >
                          {
                            logoutLoading? 'Logging Out...' : 'Logout'
                            
                          }
                        </button>
                      </div>
                    )
                  }
                </div>

              </div>
            </div>
          )}
        <div className="p-6">
          <Routes>
            <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />

            <Route path="/" element={<ProtectedRoute user={user}> <Dashboard /> </ProtectedRoute>} />
            <Route path="/predict" element={<ProtectedRoute user={user}><Predict /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute user={user}><Profile /></ProtectedRoute>} />
            <Route path="/timetable" element={<ProtectedRoute user={user}><Timetable /></ProtectedRoute>} />
            <Route path="/tutor" element={<ProtectedRoute><Tutor /></ProtectedRoute>} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App;