import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { VscAccount } from "react-icons/vsc";
import Lanyard from './Lanyard'
import ChatModal from './components/ChatModal'
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

  const [profileName, setProfileName] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchName = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();
      if (data?.name) setProfileName(data.name);
    };
    fetchName();
  }, [user]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
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
                className="yuyu-regular text-4xl font-bold text-[rgb(255,222,66)]">
                LearnTrack
              </NavLink>

              <nav className="exo-2 hidden md:flex absolute left-1/2 -translate-x-1/2 gap-6">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    isActive ? "font-semibold text-[rgb(238,238,238)]" : "text-[rgb(221,221,221)] hover:text-[rgb(255,222,66)]"
                  }
                >
                  Dashboard
                </NavLink>

                <NavLink
                  to="/timetable"
                  className={({ isActive }) =>
                    isActive ? "font-semibold text-[rgb(238,238,238)]" : "text-[rgb(221,221,221)] hover:text-[rgb(255,222,66)]"
                  }
                >
                  Timetable
                </NavLink>

                <NavLink
                  to="/tutor"
                  className={({ isActive }) =>
                    isActive ? "font-semibold text-[rgb(238,238,238)]" : "text-[rgb(221,221,221)] hover:text-[rgb(255,222,66)]"
                  }
                >
                  Tutor
                </NavLink>

                <NavLink
                  to="/predict"
                  className={({ isActive }) =>
                    isActive ? "font-semibold text-[rgb(238,238,238)]" : "text-[rgb(221,221,221)] hover:text-[rgb(255,222,66)]"
                  }
                >
                  Predict
                </NavLink>

              </nav>
              <div className="hidden md:flex items-center gap-4">
                <div
                  className="relative"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                      isActive ? "font-semibold text-[rgb(238,238,238)] text-2xl" : "text-[rgb(221,221,221)] text-2xl hover:text-[rgb(255,222,66)]"
                    }
                  >
                    <VscAccount />
                  </NavLink>
                  {isHovered && (
                    <div className="bg-black/70 text-white rounded-full absolute top-9 -right-6 w-20 text-xs text-center px-2 py-1">
                      Edit Profile
                    </div>
                  )}
                  {
                    isHovered && (
                      <div className="fixed right-0 top-18 w-78 h-screen pointer-events-none z-40">
                        <Lanyard
                          position={[0, 0, 20]}
                          gravity={[0, -40, 0]}
                          headText = "LearnTrack"
                          nameText={`${profileName || ""}`}
                          mailText={`${user.email}`}
                        />
                      </div>
                    )
                  }
                </div>

              </div>

              <button className="md:hidden cursor-pointer text-lg text-[rgb(238,238,238)]"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <span>&#9776;</span>
              </button>

              {
                menuOpen && (
                  <div className="md:hidden flex rounded-lg px-4 py-4 shadow-lg flex-col gap-2 bg-[rgb(238,238,238)] absolute right-6 top-14 z-20">
                    <div className="cause border-b-1 border-gray-400 pb-2 mb-2">
                      <p className="text-sm font-bold">{profileName || ""}</p>
                      <p className="text-sm">{user.email}</p>
                    </div>
                    <NavLink
                      to="/"
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `exo-2 ${isActive ? "font-semibold text-[rgb(32,41,64)]" : "text-[rgb(32,41,64)] hover:underline"
                      }`}
                    >
                      Dashboard
                    </NavLink>

                    <NavLink
                      to="/timetable"
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `exo-2 ${isActive ? "font-semibold text-[rgb(32,41,64)]" : "text-[rgb(32,41,64)] hover:underline"
                      }`}
                    >
                      Timetable
                    </NavLink>

                    <NavLink
                      to="/tutor"
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `exo-2 ${isActive ? "font-semibold text-[rgb(32,41,64)]" : "text-[rgb(32,41,64)] hover:underline"
                      }`}
                    >
                      Tutor
                    </NavLink>

                    <NavLink
                      to="/predict"
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `exo-2 ${isActive ? "font-semibold text-[rgb(32,41,64)]" : "text-[rgb(32,41,64)] hover:underline"
                      }`}
                    >
                      Predict
                    </NavLink>
                    <NavLink
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `exo-2 ${isActive ? "font-semibold text-[rgb(32,41,64)]" : "text-[rgb(32,41,64)] hover:underline"
                      }`}
                    >
                      Profile
                    </NavLink>
                    <button onClick={() => { handleLogout(); setMenuOpen(false); }} disabled={logoutLoading} className="sniglet-regular disabled:opacity-50 cursor-pointer text-sm bg-[rgb(75,86,148)] text-white font-bold px-3 py-2 rounded-lg hover:bg-[rgb(32,41,64)] mt-1">
                      {logoutLoading ? "Logging Out..." : "Logout"}
                    </button>
                  </div>
                )
              }
            </div>
          )}
        <div className="p-6">
          <Routes>
            <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />

            <Route path="/" element={<ProtectedRoute user={user}> <Dashboard user={user} /> </ProtectedRoute>} />
            <Route path="/predict" element={<ProtectedRoute user={user}><Predict user={user} /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute user={user}><Profile user={user} /></ProtectedRoute>} />
            <Route path="/timetable" element={<ProtectedRoute user={user}><Timetable user={user} /></ProtectedRoute>} />
            <Route path="/tutor" element={<ProtectedRoute user={user}><Tutor user={user} /></ProtectedRoute>} />
            <Route path="/chat/:mode" element={<ProtectedRoute user={user}> <ChatModal /> </ProtectedRoute>} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App;