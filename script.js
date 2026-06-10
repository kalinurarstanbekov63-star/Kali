const { useState, useEffect } = React;

function App() {
    const [view, setView] = useState('home'); 
    const [user, setUser] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [vacancies, setVacancies] = useState([]);
    const [reports, setReports] = useState([]);
    const [suggestions, setSuggestions] = useState([]); 
    const [blacklist, setBlacklist] = useState([]);
    const [isBlacklisted, setIsBlacklisted] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const [isRegMode, setIsRegMode] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [formData, setFormData] = useState({ email: '', pass: '' });
    
    const [postData, setPostData] = useState({ 
        title: '', 
        tel: '+996', 
        price: '',
        experience: 'Тажрыйбасы жок', 
        schedule: 'Толук күн',        
        description: ''              
    });
    const [postType, setPostType] = useState('job');
    const [isUploading, setIsUploading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [suggestionText, setSuggestionText] = useState("");

    // Форманы баракчага жараша ачуу функциясы
    const openPostForm = (typeFromContext) => {
        if (!user) return setShowAuth(true);
        if (typeFromContext) {
            setPostType(typeFromContext);
        }
        setView('post_form');
    };

    const cleanExpiredPosts = (postsList, path) => {
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        postsList.forEach(item => {
            if (item.createdAt && (now - item.createdAt) > threeDaysInMs) {
                window.fbApi.remove(window.fbApi.ref(window.fbDB, `${path}/${item.id}`))
                    .catch(err => console.log("Эски маалыматты өчүрүүдө ката кетти:", err));
            }
        });
    };

    useEffect(() => {
        const checkAuth = setInterval(() => {
            if (window.fbApi) {
                clearInterval(checkAuth);
                
                window.fbApi.onValue(window.fbApi.ref(window.fbDB, 'blacklist'), (s) => {
                    const d = s.val();
                    const list = d ? Object.keys(d).map(k => d[k].email) : [];
                    setBlacklist(d ? Object.keys(d).map(k => ({...d[k], id: k})) : []);
                    if (window.fbAuth.currentUser) {
                        if (list.includes(window.fbAuth.currentUser.email)) {
                            setIsBlacklisted(true);
                        } else {
                            setIsBlacklisted(false);
                        }
                    }
                });

                window.fbApi.onAuth(window.fbAuth, (u) => {
                    if (u) {
                        setUser({
                            id: u.uid,
                            name: u.displayName || u.email.split('@')[0],
                            email: u.email,
                            isAdmin: u.email === "kalinurarstanbekov63@gmail.com"
                        });
                    } else { 
                        setUser(null); 
                        setIsBlacklisted(false);
                        setView(prev => prev === 'suggestions_page' ? 'home' : prev);
                    }
                });

                window.fbApi.onValue(window.fbApi.ref(window.fbDB, 'jobs'), (s) => {
                    const d = s.val(); 
                    const list = d ? Object.keys(d).map(k => ({...d[k], id: k})).reverse() : [];
                    setJobs(list);
                    if (list.length > 0) cleanExpiredPosts(list, 'jobs');
                });

                window.fbApi.onValue(window.fbApi.ref(window.fbDB, 'vacancies'), (s) => {
                    const d = s.val(); 
                    const list = d ? Object.keys(d).map(k => ({...d[k], id: k})).reverse() : [];
                    setVacancies(list);
                    if (list.length > 0) cleanExpiredPosts(list, 'vacancies');
                });

                window.fbApi.onValue(window.fbApi.ref(window.fbDB, 'reports'), (s) => {
                    const d = s.val(); setReports(d ? Object.keys(d).map(k => ({...d[k], id: k})).reverse() : []);
                });
                
                window.fbApi.onValue(window.fbApi.ref(window.fbDB, 'suggestions'), (s) => {
                    const d = s.val(); setSuggestions(d ? Object.keys(d).map(k => ({...d[k], id: k})).reverse() : []);
                });
            }
        }, 500);
    }, []);

    useEffect(() => {
        if (user && blacklist.length > 0) {
            const emails = blacklist.map(b => b.email);
            if (emails.includes(user.email)) {
                setIsBlacklisted(true);
            }
        }
    }, [user, blacklist]);

    useEffect(() => { if(window.lucide) lucide.createIcons(); }, [view, showAuth, jobs, vacancies, reports, suggestions, blacklist, user, menuOpen, showPass, isBlacklisted, postType]);

    const showNotify = (m) => { setToast(m); setTimeout(() => setToast(null), 3000); };

    const deleteData = async (path, id) => {
        if(confirm("Чын эле өчүрөсүзбү?")) {
            try {
                await window.fbApi.remove(window.fbApi.ref(window.fbDB, `${path}/${id}`));
                showNotify("Өчүрүлдү!");
            } catch (err) { showNotify("Ката!"); }
        }
    };

    const addToBlacklist = async (email) => {
        if (email === "kalinurarstanbekov63@gmail.com") return showNotify("Админди кошууга болбойт!");
        if(confirm(`${email} дарегин кара тизмеге кошосузбу?`)) {
            try {
                await window.fbApi.push(window.fbApi.ref(window.fbDB, 'blacklist'), {
                    email: email, date: new Date().toLocaleString()
                });
                showNotify("Кара тизмеге кошулду!");
            } catch (err) { showNotify("Ката!"); }
        }
    };

    const removeFromBlacklist = async (id) => {
        try {
            await window.fbApi.remove(window.fbApi.ref(window.fbDB, `blacklist/${id}`));
            showNotify("Чыгарылды!");
        } catch (err) { showNotify("Ката!"); }
    };

    const handleReport = async (item) => {
        if (!user) return setShowAuth(true);
        const reason = prompt("Эмнеге даттанып жатасыз?");
        if (!reason) return;
        try {
            await window.fbApi.push(window.fbApi.ref(window.fbDB, 'reports'), {
                targetId: item.id, targetTitle: item.title, reason, sender: user.email, date: new Date().toLocaleString()
            });
            showNotify("Жиберилди!");
        } catch (err) { showNotify("Ката!"); }
    };

    const submitSuggestion = async () => {
        if (!user) return setShowAuth(true);
        if (!suggestionText.trim()) return showNotify("Сунушту жазыңыз!");
        try {
            await window.fbApi.push(window.fbApi.ref(window.fbDB, 'suggestions'), {
                text: suggestionText,
                sender: user.email,
                date: new Date().toLocaleString()
            });
            showNotify("Рахмат, сунуш кабыл алынды!");
            setSuggestionText("");
            setView('home'); 
        } catch (err) { showNotify("Ката кетти!"); }
    };

    const submitPost = async () => {
        if (!postData.title || !postData.tel || postData.tel === '+996') return showNotify("Толук толтуруңуз!");
        if (postData.tel.length !== 13) return showNotify("Номер толук эмес! (+996 жана 9 сан болушу керек)");
        
        setIsUploading(true);
        try {
            const path = postType === 'job' ? 'jobs' : 'vacancies';
            
            const dataToSave = {
                title: postData.title,
                tel: postData.tel,
                price: postData.price || "Келишимдүү",
                author: user ? user.name : "Конок",
                authorEmail: user ? user.email : "Аноним",
                date: new Date().toLocaleDateString(),
                createdAt: Date.now()
            };

            if (postType === 'vacancy') {
                dataToSave.experience = postData.experience;
                dataToSave.schedule = postData.schedule;
                dataToSave.description = postData.description || "Кыскача маалымат жазылган эмес";
            }
            
            showNotify("Жарыя базага сакталууда...");
            await window.fbApi.push(window.fbApi.ref(window.fbDB, path), dataToSave);
            
            showNotify("Жарыяланды!");
            setView(postType === 'job' ? 'jobs_list' : 'vacancies_list');
            setPostData({ title: '', tel: '+996', price: '', experience: 'Тажрыйбасы жок', schedule: 'Толук күн', description: '' });
        } catch (err) { 
            console.error(err);
            showNotify("Ката кетти!"); 
        } finally {
            setIsUploading(false);
        }
    };

    const handlePhoneChange = (e) => {
        let val = e.target.value;
        if (!val.startsWith('+996')) {
            val = '+996';
        }
        const cleaned = '+' + val.replace(/[^\d]/g, '');
        if (cleaned.length <= 13) {
            setPostData({ ...postData, tel: cleaned });
        }
    };

    if (isBlacklisted) {
        return (
            <div className="fixed inset-0 z-[9999] bg-slate-100 flex items-center justify-center p-4 text-center">
                <div className="bg-white border border-red-200 p-8 md:p-12 rounded-[32px] max-w-md w-full shadow-xl space-y-6">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <i data-lucide="shield-alert" className="w-10 h-10"></i>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Сиз кара тизмедесиз!</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">Эреже бузгандыгыңыз үчүн сиздин аккаунтуңуз бөгөттөлгөн.</p>
                    <div className="pt-4">
                        <a href="https://wa.me/996777100309" target="_blank" className="w-full block bg-emerald-600 text-white py-4 rounded-xl font-bold text-sm tracking-wider uppercase shadow-md hover:bg-emerald-700 transition">Admin менен байланышуу</a>
                    </div>
                    <button onClick={() => window.fbApi.signOut(window.fbAuth).then(() => setIsBlacklisted(false))} className="text-xs text-slate-400 hover:text-slate-600 uppercase tracking-widest underline">Аккаунттан чыгуу</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
            {/* НАВИГАЦИЯ ПАНЕЛИ */}
            <nav className="bg-emerald-600 sticky top-0 z-[100] px-4 md:px-10 h-16 flex items-center justify-between text-white shadow-md">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setView('home'); setMenuOpen(false); }}>
                    <div className="w-15 h-12 bg-white/20 rounded-xl flex items-center justify-center overflow-hidden">
  <img src="public/logo.png" alt="Иш Булак" className="w-full h-full object-cover" />
</div>

                </div>

                <div className="hidden md:flex gap-8 font-bold text-xs tracking-wider">
                    <button onClick={() => setView('home')} className={view === 'home' ? 'text-white border-b-2 border-white py-2' : 'text-white/80 hover:text-white py-2 transition'}>БАШКЫ</button>
                    <button onClick={() => setView('jobs_list')} className={view === 'jobs_list' ? 'text-white border-b-2 border-white py-2' : 'text-white/80 hover:text-white py-2 transition'}>ЖУМУШТАР</button>
                    <button onClick={() => setView('vacancies_list')} className={view === 'vacancies_list' ? 'text-white border-b-2 border-white py-2' : 'text-white/80 hover:text-white py-2 transition'}>ВАКАНСИЯЛАР</button>
                    
                    {user && (
                        <button onClick={() => setView('suggestions_page')} className={view === 'suggestions_page' ? 'text-white border-b-2 border-white py-2' : 'text-white/80 hover:text-white py-2 transition'}>СУНУШТАР</button>
                    )}
                    
                    {user?.isAdmin && (
                        <button onClick={() => setView('admin')} className={`font-black tracking-wider transition py-2 ${view === 'admin' ? 'text-yellow-300 border-b-2 border-yellow-300' : 'text-yellow-200 hover:text-yellow-300'}`}>АДМИН ({reports.length + suggestions.length})</button>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:block">
                        {user ? (
                            <div className="flex items-center gap-3 bg-white/10 p-1.5 pl-4 rounded-xl border border-white/20">
                                <span className="text-xs font-bold text-white">{user.name}</span>
                                <button onClick={() => window.fbApi.signOut(window.fbAuth)} className="bg-emerald-700 text-white p-2 rounded-lg hover:bg-emerald-800 transition"><i data-lucide="log-out" className="w-3.5 h-3.5"></i></button>
                            </div>
                        ) : (
                            <button onClick={() => setShowAuth(true)} className="bg-white text-emerald-600 font-bold px-5 py-2 rounded-xl text-xs uppercase tracking-wider hover:bg-slate-100 transition">КИРҮҮ</button>
                        )}
                    </div>
                    <button onClick={() => setMenuOpen(!menuOpen)} className="block md:hidden p-2 text-white focus:outline-none">
                        <i data-lucide={menuOpen ? "x" : "menu"} className="w-6 h-6"></i>
                    </button>
                </div>
            </nav>

            {/* БУРГЕР МЕНЮ */}
            {menuOpen && (
                <div className="md:hidden fixed top-16 left-0 w-full bg-white border-b border-slate-200 z-[99] flex flex-col p-6 gap-4 font-bold text-sm tracking-wider shadow-lg text-slate-800">
                    <button onClick={() => { setView('home'); setMenuOpen(false); }} className={`text-left py-2 ${view === 'home' ? 'text-emerald-600' : ''}`}>БАШКЫ</button>
                    <button onClick={() => { setView('jobs_list'); setMenuOpen(false); }} className={`text-left py-2 ${view === 'jobs_list' ? 'text-emerald-600' : ''}`}>ЖУМУШТАР</button>
                    <button onClick={() => { setView('vacancies_list'); setMenuOpen(false); }} className={`text-left py-2 ${view === 'vacancies_list' ? 'text-emerald-600' : ''}`}>ВАКАНСИЯЛАР</button>
                    
                    {user && (
                        <button onClick={() => { setView('suggestions_page'); setMenuOpen(false); }} className={`text-left py-2 ${view === 'suggestions_page' ? 'text-emerald-600' : ''}`}>СУНУШТАР</button>
                    )}
                    
                    {user?.isAdmin && (
                        <button onClick={() => { setView('admin'); setMenuOpen(false); }} className="text-left py-2 text-yellow-600 font-black">АДМИН ({reports.length + suggestions.length})</button>
                    )}
                    <hr className="my-2 border-slate-200" />
                    {user ? (
                        <button onClick={() => { window.fbApi.signOut(window.fbAuth); setMenuOpen(false); }} className="w-full bg-emerald-600 text-white text-center py-3 rounded-xl font-bold">ЧЫГУУ</button>
                    ) : (
                        <button onClick={() => { setShowAuth(true); setMenuOpen(false); }} className="w-full bg-emerald-600 text-white text-center py-3 rounded-xl font-bold">КИРҮҮ</button>
                    )}
                </div>
            )}

            {/* МЕЙКИНДИК */}
            <main className="flex-grow p-4 md:p-8">
                {view === 'home' && (
                    <div className="py-16 md:py-24 text-center max-w-4xl mx-auto space-y-12">
                        <div>
                            <span className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-xs font-extrabold tracking-wider uppercase mb-6 inline-block border border-emerald-100">Кыргызстандагы №1 платформа</span>
                            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black mb-6 uppercase tracking-tight text-slate-900 leading-none">ИШ ТАБУУ <br/><span className="text-emerald-600 italic">АБДАН ОҢОЙ</span></h1>
                            <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto mb-10 font-medium">Жумуш издеңиз же өзүңүздүн вакансияңызды кошуп, эң мыкты адистерди тез арада табыңыз.</p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto px-4">
                                <button onClick={() => setView('jobs_list')} className="bg-emerald-600 text-white font-bold py-3.5 rounded-xl text-sm w-full hover:bg-emerald-700 transition shadow-sm">ЖУМУШ ИЗДӨӨ</button>
                                <button onClick={() => openPostForm('job')} className="bg-white text-slate-800 font-bold py-3.5 rounded-xl text-sm w-full border border-slate-200 hover:bg-slate-50 transition shadow-sm">ЖАРЫЯ КОШУУ</button>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'suggestions_page' && user && (
                    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 md:p-10 relative shadow-sm">
                        <button onClick={() => setView('home')} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-all">
                            <i data-lucide="x" className="w-4 h-4"></i>
                        </button>
                        
                        <h2 className="text-xl font-black mb-2 uppercase text-center text-slate-900 flex items-center justify-center gap-2">
                            <i data-lucide="message-square-plus" className="text-emerald-600"></i> Сайтты жакшыртуу
                        </h2>
                        <p className="text-slate-500 text-xs text-center mb-6">
                            Порталды дагы да ыңгайлуу кылуу үчүн кандай сунушуңуз бар? Жазып калтырыңыз!
                        </p>
                        
                        <div className="space-y-4">
                            <textarea 
                                value={suggestionText}
                                onChange={(e) => setSuggestionText(e.target.value)}
                                placeholder="Бул жерге өз сунушуңузду кенен жазсаңыз болот..." 
                                className="w-full min-h-[150px] resize-none text-sm p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-800 break-all"
                            ></textarea>
                            <button onClick={submitSuggestion} className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-sm">
                                <i data-lucide="send" className="w-4 h-4"></i> Сунушту жөнөтүү
                            </button>
                        </div>
                    </div>
                )}

                {/* АДМИН ПАНЕЛЬ */}
                {view === 'admin' && user?.isAdmin && (
                    <div className="max-w-6xl mx-auto space-y-8 bg-white p-6 md:p-10 rounded-2xl border border-slate-200 text-slate-800 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                            <h2 className="text-xl md:text-2xl font-black uppercase text-emerald-600 flex items-center gap-2"><i data-lucide="sliders"></i> Администратор башкаруусу</h2>
                            <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-bold text-xs uppercase border border-emerald-100">Башкы admin</span>
                        </div>
                        
                        {/* ДАТТАНУУЛАР */}
                        <div className="space-y-3">
                            <h3 className="font-black text-sm uppercase tracking-wider text-slate-600 flex items-center gap-2"><i data-lucide="flag" className="text-emerald-600"></i> Даттануулар ({reports.length})</h3>
                            <div className="grid gap-3">
                                {reports.length === 0 ? <p className="text-slate-400 text-xs italic">Даттануулар жок...</p> : reports.map(r => (
                                    <div key={r.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="space-y-1">
                                            <p className="font-bold text-sm text-slate-800">Объект: <span className="text-emerald-600">{r.targetTitle}</span></p>
                                            <p className="text-red-500 text-xs font-semibold">Себеби: {r.reason}</p>
                                            <p className="text-slate-400 text-[10px]">Жөнөтүүчү: {r.sender} | {r.date}</p>
                                        </div>
                                        <div className="flex gap-2 w-full md:w-auto justify-end">
                                            <button onClick={() => addToBlacklist(r.sender)} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition">
                                                 Кара тизмеге
                                            </button>
                                            <button onClick={() => deleteData('reports', r.id)} className="bg-slate-200 text-slate-700 p-2 rounded-lg hover:bg-slate-300 transition"><i data-lucide="check" className="w-3.5 h-3.5"></i></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* КЕЛГЕН СУНУШТАР */}
                        <div className="space-y-3">
                            <h3 className="font-black text-sm uppercase tracking-wider text-slate-600 flex items-center gap-2"><i data-lucide="message-square" className="text-emerald-600"></i> Келген сунуштар ({suggestions.length})</h3>
                            <div className="grid gap-3">
                                {suggestions.length === 0 ? <p className="text-slate-400 text-xs italic">Сунуштар келе элек...</p> : suggestions.map(s => (
                                    <div key={s.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <p className="text-slate-800 text-sm font-medium break-all">"{s.text}"</p>
                                            <p className="text-slate-400 text-[10px]">Автору: {s.sender} | {s.date}</p>
                                        </div>
                                        <div className="w-full md:w-auto flex justify-end">
                                            <button onClick={() => deleteData('suggestions', s.id)} className="text-red-500 p-2 rounded-lg bg-red-50 border border-red-100 hover:bg-red-500 hover:text-white transition">
                                                <i data-lucide="trash-2" className="w-3.5 h-3.5"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* КАРА ТИЗМЕ */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                            <h3 className="font-black text-sm uppercase tracking-wider text-red-500 mb-3 flex items-center gap-2"><i data-lucide="shield-x"></i> Кара тизмедегилер ({blacklist.length})</h3>
                            <div className="divide-y divide-slate-200 max-h-60 overflow-y-auto pr-2">
                                {blacklist.length === 0 ? <p className="text-slate-400 text-xs italic py-2">Кара тизме бош...</p> : blacklist.map(b => (
                                    <div key={b.id} className="flex justify-between items-center py-2.5">
                                        <div className="text-xs">
                                            <p className="font-bold text-slate-700">{b.email}</p>
                                            <p className="text-[9px] text-slate-400">Убакыт: {b.date}</p>
                                        </div>
                                        <button onClick={() => removeFromBlacklist(b.id)} className="text-xs text-emerald-600 font-bold underline">Чыгаруу</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ЖУМУШ ЖАНА ВАКАНСИЯ ТИЗМЕЛЕРИ */}
                {(view === 'jobs_list' || view === 'vacancies_list') && (
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="border-l-4 border-emerald-600 pl-4">
                                <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-tight">{view === 'jobs_list' ? 'ЖУМУШТАР' : 'ВАКАНСИЯЛАР'}</h2>
                                <p className="text-slate-400 text-[10px] mt-0.5">Акыркы 3 күндө кошулган маалыматтар гана көрсөтүлөт</p>
                            </div>
                            
                            {/* БУЛ ЖЕРДЕ БАРАКЧАГА ЖАРАША ТИЙЕШЕЛҮҮ ФОРМАНЫ АЧАБЫЗ */}
                            <button 
                                onClick={() => openPostForm(view === 'jobs_list' ? 'job' : 'vacancy')} 
                                className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 self-stretch sm:self-auto justify-center hover:bg-emerald-700 transition shadow-sm"
                            >
                                <i data-lucide="plus" className="w-3.5 h-3.5"></i>Жарыя кошуу
                            </button>
                        </div>
                        
                        {/* КАРТОЧКАЛАР ТИЗМЕСИ */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                            {(view === 'jobs_list' ? jobs : vacancies).length === 0 ? (
                                <div className="col-span-full text-center py-12 text-slate-400 font-bold italic bg-white rounded-xl border border-dashed border-slate-200">Жарыялар азырынча жок же мөөнөтү бүткөн...</div>
                            ) : (view === 'jobs_list' ? jobs : vacancies).map(item => (
                                <div key={item.id} className="bg-white border border-slate-200/80 p-3 md:p-4 flex flex-col justify-between rounded-xl shadow-sm min-w-0 overflow-hidden">
                                    <div className="space-y-2 min-w-0">
                                        <div className="flex items-center justify-between text-[9px] md:text-xs text-slate-400 font-medium">
                                            <span className="flex items-center gap-1"><i data-lucide="calendar" className="w-3 h-3"></i> {item.date || "Бүгүн"}</span>
                                        </div>
                                        
                                        <p className="text-emerald-600 font-black text-sm md:text-lg break-all">
                                            {item.price}
                                        </p>

                                        <h3 className="text-xs md:text-base font-bold text-slate-800 leading-tight break-all line-clamp-2">{item.title}</h3>
                                        
                                        {view === 'vacancies_list' && (
                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex flex-wrap gap-1">
                                                    <span className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded font-semibold">{item.experience}</span>
                                                    <span className="bg-emerald-50 text-emerald-700 text-[9px] px-2 py-0.5 rounded font-semibold">{item.schedule}</span>
                                                </div>
                                                {item.description && (
                                                    <p className="text-slate-500 text-[11px] font-medium line-clamp-2 break-all italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                                        <button onClick={() => handleReport(item)} className="text-slate-400 hover:text-red-500 transition p-1.5 rounded-lg bg-slate-50 border border-slate-200" title="Даттануу">
                                            <i data-lucide="flag" className="w-3.5 h-3.5"></i>
                                        </button>
                                        <div className="flex gap-1 flex-1 justify-end">
                                            <a href={`tel:${item.tel}`} className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg font-bold text-[10px] md:text-xs uppercase text-center flex items-center justify-center gap-1 border border-slate-200">
                                                <i data-lucide="phone" className="w-3 h-3"></i> <span className="hidden sm:inline">Чалуу</span>
                                            </a>
                                            <a href={`https://wa.me/${item.tel.replace('+', '')}`} target="_blank" className="bg-emerald-500 text-white p-2 rounded-lg font-bold text-[10px] md:text-xs uppercase text-center flex items-center justify-center gap-1 hover:bg-emerald-600 transition shadow-sm">
                                                <i data-lucide="message-circle" className="w-3 h-3"></i> <span className="hidden sm:inline">WhatsApp</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ӨЗГӨРТҮЛГӨН ЖАРЫЯ КОШУУ ФОРМАСЫ */}
                {view === 'post_form' && (
                    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 md:p-10 relative shadow-sm">
                        <button onClick={() => setView(postType === 'job' ? 'jobs_list' : 'vacancies_list')} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-all">
                            <i data-lucide="x" className="w-4 h-4"></i>
                        </button>

                        <h2 className="text-xl font-black mb-6 uppercase text-center text-slate-900 border-b border-slate-100 pb-3">
                            {postType === 'job' ? 'Жумушчу издөө жарыясы' : 'Ишканага Вакансия жарыялоо'}
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    {postType === 'job' ? 'Кайсы тармакта жумуш издейсиз?' : 'Кандай кызматка жумушчу керек? (Жумуш орду)'}
                                </label>
                                <input placeholder={postType === 'job' ? "Мис: Тажрыйбалуу малярмын, жумуш издейм" : "Мис: Офиске башкы бухгалтер керек"} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-800 text-sm" value={postData.title} onChange={e => setPostData({...postData, title: e.target.value})} />
                            </div>

                            {/* ЭГЕР ВАКАНСИЯ БОЛСО ГАНА БУЛ СУРООЛОР КӨРҮНӨТ */}
                            {postType === 'vacancy' && (
                                <React.Fragment>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Тажрыйбасы (Стаж)</label>
                                            <select 
                                                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-800 text-sm font-medium"
                                                value={postData.experience}
                                                onChange={e => setPostData({...postData, experience: e.target.value})}
                                            >
                                                <option value="Тажрыйбасы жок">Тажрыйбасы жок</option>
                                                <option value="1 жылдан 3 жылга чейин">1 жылдан 3 жылга чейин</option>
                                                <option value="3 жылдан ашык">3 жылдан ашык стаж</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Жумуш графиги</label>
                                            <select 
                                                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-800 text-sm font-medium"
                                                value={postData.schedule}
                                                onChange={e => setPostData({...postData, schedule: e.target.value})}
                                            >
                                                <option value="Толук күн">Толук күн</option>
                                                <option value="Ийкемдүү график">Ийкемдүү график</option>
                                                <option value="Алыстан иштөө">Удаленно (Алыстан)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Милдеттери жана Талаптар (Кыскача маалымат)</label>
                                        <textarea 
                                            placeholder="Мис: Ишкананын отчетторун толтуруу, 1С программасын билүүсү шарт..." 
                                            className="w-full min-h-[100px] p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-800 text-sm resize-none"
                                            value={postData.description}
                                            onChange={e => setPostData({...postData, description: e.target.value})}
                                        ></textarea>
                                    </div>
                                </React.Fragment>
                            )}
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Байланыш номери</label>
                                    <input type="text" placeholder="+996" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-800 text-sm" value={postData.tel} onChange={handlePhoneChange} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        {postType === 'job' ? 'Күтүлгөн кызмат акы' : 'Айлык акысы (Же Суммасы)'}
                                    </label>
                                    <input placeholder="Мис: 40000 Сом же Келишимдүү" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-800 text-sm" value={postData.price} onChange={e => setPostData({...postData, price: e.target.value})} />
                                </div>
                            </div>
                            
                            <button onClick={submitPost} disabled={isUploading} className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl text-sm uppercase mt-4 tracking-wider hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm">
                                {isUploading ? "ЖҮКТӨЛҮҮДӨ..." : "ЖАРЫЯНЫ ЖАЙГАНАШТЫРУУ"}
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* АВТОРИЗАЦИЯ ТЕРЕЗЕСИ */}
            {showAuth && (
                <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-[400px] p-8 relative mx-2 shadow-xl">
                        <button onClick={() => setShowAuth(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><i data-lucide="x" className="w-3.5 h-3.5"></i></button>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-black uppercase text-slate-900 mb-1">{isRegMode ? 'Катталуу' : 'Кирүү'}</h2>
                            <p className="text-slate-400 text-[10px] tracking-wider uppercase font-bold">Кош келиңиз!</p>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const action = isRegMode ? window.fbApi.createUser : window.fbApi.signIn;
                            action(window.fbAuth, formData.email, formData.pass).then(() => setShowAuth(false)).catch(() => showNotify("Ката же Мындай колдонуучу жок!"));
                        }} className="space-y-4">
                            <input type="email" placeholder="Email дарек" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-800 text-sm" onChange={e => setFormData({...formData, email: e.target.value})} required />
                            
                            <div className="relative w-full flex items-center">
                                <input 
                                    type={showPass ? "text" : "password"} 
                                    placeholder="Пароль" 
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-800 text-sm pr-12" 
                                    onChange={e => setFormData({...formData, pass: e.target.value})} 
                                    required 
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 text-slate-400 hover:text-slate-600 focus:outline-none">
                                    <i data-lucide={showPass ? "eye-off" : "eye"} className="w-4 h-4"></i>
                                </button>
                            </div>
                            
                            <button className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-xs mt-2 hover:bg-emerald-700 transition shadow-sm">Улантуу</button>
                        </form>
                        <div className="text-center mt-5">
                            <button onClick={() => setIsRegMode(!isRegMode)} className="text-xs font-bold text-emerald-600 hover:underline uppercase tracking-wider">
                                {isRegMode ? 'Аккаунтуңуз барбы? Кирүү' : 'Жаңы аккаунт түзүү (Катталуу)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ТОАСТ БИЛДИРҮҮСҮ */}
            {toast && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-xl text-xs uppercase tracking-wider text-center">{toast}</div>}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);