import React, { createContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, Appointment, Settings, Theme, ThemePalette, Pendency, SettingCategory, TextPalette, FinancialTransaction, FinancialPage, FinancialAccount, ThirdParty, AppointmentStatus, PendencyStatus } from '../types.ts';
import { db, auth } from '../firebaseConfig.ts';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, query, where, writeBatch, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword as fbUpdatePassword, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { Page } from '../App.tsx';

export interface AppContextType {
  theme: Theme; toggleTheme: () => void; setTheme: (theme: Theme) => void;
  themePalette: ThemePalette; setThemePalette: (palette: ThemePalette) => void;
  textPalette: TextPalette; setTextPalette: (palette: TextPalette) => void;
  user: User | null; users: User[]; appointments: Appointment[]; pendencies: Pendency[];
  financials: FinancialTransaction[]; financialsLoaded: boolean; accounts: FinancialAccount[]; thirdParties: ThirdParty[];
  settings: Settings; logo: string | null; updateLogo: (logo: string | null) => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  loading: boolean; isOnline: boolean; notification: string | null; clearNotification: () => void;
  triggerNotification: (message?: string) => void; pageNotifications: Record<Page, boolean>; clearPageNotification: (page: Page) => void;
  login: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void; sendPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  updatePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  activePage: Page; setActivePage: (page: Page) => void;
  activeFinancialPage: FinancialPage; setActiveFinancialPage: (page: FinancialPage) => void;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'stringId'>) => Promise<void>;
  updateAppointment: (appointment: Appointment) => Promise<void>;
  deleteAppointment: (stringId: string) => Promise<void>;
  batchAddAppointments: (appointments: Omit<Appointment, 'id' | 'stringId'>[]) => Promise<void>;
  batchDeleteAppointments: (stringIds: string[]) => Promise<void>;
  addMessageToAppointment: (appointmentStringId: string, messageText: string) => Promise<void>;
  addPendency: (pendency: Omit<Pendency, 'id' | 'stringId'>) => Promise<void>;
  updatePendency: (pendency: Pendency) => Promise<void>;
  deletePendency: (stringId: string) => Promise<void>;
  addFinancial: (transaction: Omit<FinancialTransaction, 'id' | 'stringId'>) => Promise<void>;
  updateFinancial: (transaction: FinancialTransaction) => Promise<void>;
  deleteFinancial: (stringId: string) => Promise<void>;
  addAccount: (account: Omit<FinancialAccount, 'id' | 'stringId'>) => Promise<void>;
  updateAccount: (account: FinancialAccount) => Promise<void>;
  deleteAccount: (stringId: string) => Promise<void>;
  addThirdParty: (thirdParty: Omit<ThirdParty, 'id' | 'stringId'>) => Promise<void>;
  updateThirdParty: (thirdParty: ThirdParty) => Promise<void>;
  deleteThirdParty: (stringId: string) => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<{success: boolean, message: string}>;
  updateUser: (user: User) => Promise<void>;
  updateUserPhoto: (userId: string, photoURL: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

const initialSettings: Settings = {
    appName: 'GestorPRO', logoUrl: null, requesters: [], demands: [], inspectionTypes: [], patios: [], 
    statuses: [{ id: '1', name: 'Solicitado' }, { id: '2', name: 'Agendado' }, { id: '3', name: 'Em Andamento' }, { id: '4', name: 'Concluído' }, { id: '5', name: 'Pendente' }, { id: '6', name: 'Finalizado' }],
    financialCategories: [], services: [], enableSoundAlert: true, enableVibrationAlert: true, masterPassword: '002219',
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [themePalette, setThemePaletteState] = useState<ThemePalette>(() => (localStorage.getItem('themePalette') as ThemePalette) || 'blue');
  const [textPalette, setTextPaletteState] = useState<TextPalette>(() => (localStorage.getItem('textPalette') as TextPalette) || 'gray');
  
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pendencies, setPendencies] = useState<Pendency[]>([]);
  const [financials, setFinancials] = useState<FinancialTransaction[]>([]);
  const [financialsLoaded, setFinancialsLoaded] = useState(false);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([]);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [logo, setLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notification, setNotification] = useState<string | null>(null);
  const [pageNotifications, setPageNotifications] = useState<Record<Page, boolean>>({} as Record<Page, boolean>);
  const [activePage, setActivePage] = useState<Page>('Agendamentos');
  const [activeFinancialPage, setActiveFinancialPage] = useState<FinancialPage>('Dashboard');

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.palette = themePalette;
    localStorage.setItem('themePalette', themePalette);
  }, [themePalette]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        onSnapshot(doc(db, 'users', fbUser.uid), (docSnap) => {
          if (docSnap.exists()) setUser({ id: docSnap.id, ...docSnap.data() } as User);
          setLoading(false);
        });
        onSnapshot(doc(db, 'settings', 'default'), (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data() as Settings;
              setSettings({ ...initialSettings, ...data });
              setLogo(data.logoUrl || null);
          }
        });
      } else {
        setUser(null); setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribers = [
        onSnapshot(collection(db, 'users'), (s) => setUsers(s.docs.map(d => ({id: d.id, ...d.data()} as User)))),
        onSnapshot(collection(db, 'appointments'), (s) => setAppointments(s.docs.map((d, i) => ({id: i, stringId: d.id, ...d.data()} as Appointment)))),
        onSnapshot(collection(db, 'pendencies'), (s) => setPendencies(s.docs.map((d, i) => ({id: i, stringId: d.id, ...d.data()} as Pendency)))),
        onSnapshot(collection(db, 'financials'), (s) => {
            setFinancials(s.docs.map((d, i) => ({id: i, stringId: d.id, ...d.data()} as FinancialTransaction)));
            setFinancialsLoaded(true);
        }),
        onSnapshot(collection(db, 'accounts'), (s) => setAccounts(s.docs.map((d, i) => ({id: i, stringId: d.id, ...d.data()} as FinancialAccount)))),
        onSnapshot(collection(db, 'thirdParties'), (s) => setThirdParties(s.docs.map((d, i) => ({id: i, stringId: d.id, ...d.data()} as ThirdParty))))
    ];
    return () => unsubscribers.forEach(u => u());
  }, [user]);

  const triggerNotification = (m = 'Sucesso') => setNotification(m);
  const clearNotification = () => setNotification(null);

  const value: AppContextType = {
    theme, toggleTheme: () => setThemeState(t => t === 'light' ? 'dark' : 'light'), setTheme: setThemeState,
    themePalette, setThemePalette: setThemePaletteState, textPalette, setTextPalette: setTextPaletteState,
    user, users, appointments, pendencies, financials, financialsLoaded, accounts, thirdParties, settings, logo,
    updateLogo: async (l) => { await updateDoc(doc(db, 'settings', 'default'), { logoUrl: l }); },
    updateSettings: async (s) => { await setDoc(doc(db, 'settings', 'default'), s, { merge: true }); triggerNotification('Configurações salvas.'); },
    loading, isOnline, notification, clearNotification, triggerNotification, pageNotifications, 
    clearPageNotification: (p) => setPageNotifications(prev => ({ ...prev, [p]: false })),
    login: async (e, p) => { try { await signInWithEmailAndPassword(auth, e, p); return { success: true, message: '' }; } catch (err) { return { success: false, message: 'Erro no login.' }; } },
    logout: () => signOut(auth),
    sendPasswordReset: async (e) => { try { await sendPasswordResetEmail(auth, e); return { success: true, message: 'Email enviado.' }; } catch (err) { return { success: false, message: 'Erro.' }; } },
    resetPassword: async (e) => { try { await sendPasswordResetEmail(auth, e); return { success: true, message: 'Email enviado.' }; } catch (err) { return { success: false, message: 'Erro.' }; } },
    updatePassword: async (o, n) => { try { await fbUpdatePassword(auth.currentUser!, n); return { success: true, message: 'Senha atualizada.' }; } catch (e: any) { return { success: false, message: e.message }; } },
    activePage, setActivePage, activeFinancialPage, setActiveFinancialPage,
    addAppointment: async (a) => { await addDoc(collection(db, 'appointments'), a); triggerNotification('Agendado!'); },
    updateAppointment: async (a) => { const {id, stringId, ...data} = a; await updateDoc(doc(db, 'appointments', stringId!), data); },
    deleteAppointment: async (sid) => { await deleteDoc(doc(db, 'appointments', sid)); },
    batchAddAppointments: async (as) => { const b = writeBatch(db); as.forEach(a => b.set(doc(collection(db, 'appointments')), a)); await b.commit(); },
    batchDeleteAppointments: async (ids) => { const b = writeBatch(db); ids.forEach(id => b.delete(doc(db, 'appointments', id))); await b.commit(); },
    addMessageToAppointment: async (sid, t) => { await updateDoc(doc(db, 'appointments', sid), { messages: arrayUnion({ authorId: user?.id, authorName: user?.name, text: t, timestamp: Date.now() }) }); },
    addPendency: async (p) => { await addDoc(collection(db, 'pendencies'), p); },
    updatePendency: async (p) => { const {id, stringId, ...data} = p; await updateDoc(doc(db, 'pendencies', stringId!), data); },
    deletePendency: async (sid) => { await deleteDoc(doc(db, 'pendencies', sid)); },
    addFinancial: async (f) => { await addDoc(collection(db, 'financials'), f); },
    updateFinancial: async (f) => { const {id, stringId, ...data} = f; await updateDoc(doc(db, 'financials', stringId!), data); },
    deleteFinancial: async (sid) => { await deleteDoc(doc(db, 'financials', sid)); },
    addAccount: async (a) => { await addDoc(collection(db, 'accounts'), a); },
    updateAccount: async (a) => { const {id, stringId, ...data} = a; await updateDoc(doc(db, 'accounts', stringId!), data); },
    deleteAccount: async (sid) => { await deleteDoc(doc(db, 'accounts', sid)); },
    addThirdParty: async (t) => { await addDoc(collection(db, 'thirdParties'), t); },
    updateThirdParty: async (t) => { const {id, stringId, ...data} = t; await updateDoc(doc(db, 'thirdParties', stringId!), data); },
    deleteThirdParty: async (sid) => { await deleteDoc(doc(db, 'thirdParties', sid)); },
    addUser: async (u) => { try { const res = await createUserWithEmailAndPassword(auth, u.email, '123mudar'); await setDoc(doc(db, 'users', res.user.uid), { ...u, forcePasswordChange: true }); return { success: true, message: 'Usuário criado.' }; } catch (e: any) { return { success: false, message: e.message }; } },
    updateUser: async (u) => { const {id, ...data} = u; await updateDoc(doc(db, 'users', id), data); },
    updateUserPhoto: async (uid, url) => { await updateDoc(doc(db, 'users', uid), { photoURL: url }); },
    deleteUser: async (uid) => { await deleteDoc(doc(db, 'users', uid)); }
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};