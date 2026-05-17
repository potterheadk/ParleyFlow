export default function AppSignature() {
    return (
        <div className="text-[11px] leading-tight text-slate-500">
            <div className="font-semibold text-slate-700">ParleyFlow</div>
            <div className="flex flex-wrap justify-center gap-1 text-slate-500">
                <span>Developed by Nachiket with ❤️</span>
                <span className="hidden sm:inline">·</span>
                <a
                    href="https://github.com/potterheadk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-slate-700"
                >
                    GitHub
                </a>
                <span className="hidden sm:inline">·</span>
                <a
                    href="https://www.linkedin.com/in/nachiket-kulkarni-362a54266/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-slate-700"
                >
                    LinkedIn
                </a>
            </div>
        </div>
    );
}
