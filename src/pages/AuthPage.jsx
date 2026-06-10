import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AuthPage(){
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError('');
        setMessage('');
        setLoading(true);

        if(isLogin){
            //const error = result.error
            const { error } = await supabase.auth.signInWithPassword({ email, password});
            if(error) setError(error.message)
        }
        else{
            const { error } = await supabase.auth.signUp({email, password});
            if (error) setError(error.message);
            else setMessage('Check your email to confirm your account.');

        }

        setLoading(false);
        
    }
    
    return(
        <div className="min-h-screen bg-[rgb(234,224,207)] flex items-center justify-center" >
            <div className="bg-[rgb(238,238,238)] rounded-2xl shadow-lg p-8 w-full max-w-md">
                <h1 className="text-2xl bg-[rgb(32,41,64)] font-bold text-[rgb(255,222,66)] mb-2 p-4 rounded-4xl flex items-center justify-center">LearnTrack</h1>
                <p className="flex items-center justify-center text-sm text-[rgb(75,64,56)] mb-2 mt-4">
                    {
                        isLogin ? 'Welcome back! Sign in to continue.'
                        : 'Create your account.'
                    }
                </p>
                
                <div className="flex flex-col gap-3">
                    <input 
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className = "border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(32,41,64)]"
                    />
                    <input 
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        className = "border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(32,41,64)]"
                    />
                </div>

                {error && <p className="text-red-500 text-xs mt-4">{error}</p>}
                {message && <p className="text-green-600 text-xs my-3">{message}</p>}


                <button
                    onClick = {handleSubmit}
                    disabled = {loading}
                    className="w-full bg-[rgb(75,86,148)] text-white font-bold px-4 py-2 mt-4 rounded-lg hover:bg-[rgb(32,41,64)] disabled:opacity-50"
                    >
                        {
                            loading? 'Please wait...'
                            : isLogin? 'Sign In' : 'Sign Up'
                        }
                </button>

                <p className="mt-4 text-xs text-center text-[rgb(75,64,56)]">
                    {
                        isLogin? "Don't have an account?  " : "Already have an account?  "
                    }
                    <button
                        onClick={
                            ()=>{
                                setIsLogin(!isLogin);
                                setError('');
                                setMessage('');
                            }
                        }
                        className="text-[rgb(32,41,64)] font-semibold hover:underline cursor-pointer"
                    >
                        {
                            isLogin? ' Sign Up ' : ' Sign In '
                        }
                    </button>
                </p>
            </div>
        </div>
    )
}