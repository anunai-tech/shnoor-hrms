import { useNavigate } from 'react-router-dom'
import useSubdomain from '../../hooks/useSubdomain'

// shown at acmecorp.shnoor.com/ before login
function CompanyLanding() {
    const navigate = useNavigate()
    const { companySlug } = useSubdomain()

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-10 text-center">

                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-white font-display font-bold text-2xl uppercase">
                        {companySlug?.[0] || 'C'}
                    </span>
                </div>

                <h1 className="font-display text-2xl font-bold text-gray-800 capitalize mb-2">
                    {companySlug} HRMS
                </h1>
                <p className="font-body text-gray-500 text-sm mb-8">
                    Welcome to your company portal. Login to continue.
                </p>

                <button
                    onClick={() => navigate('/login')}
                    className="font-display w-full bg-primary hover:opacity-90 text-quaternary font-semibold py-3 rounded-lg transition text-sm"
                >
                    Login to Portal
                </button>

                <p className="font-body text-xs text-gray-400 mt-8">
                    Powered by{' '}
                    <a href="https://shnoor.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        SHNOOR HRMS
                    </a>
                </p>
            </div>
        </div>
    )
}

export default CompanyLanding