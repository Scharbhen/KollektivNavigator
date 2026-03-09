"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Download, FileText, Mail, Users } from "lucide-react";

type Lead = {
  id: string;
  email: string;
  source: string;
  metadata: any;
  createdAt: string;
};

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    fetch("/api/leads")
      .then((res) => res.json())
      .then((data) => {
        if (data.leads) {
          // Sort by newest first
          setLeads(data.leads.sort((a: Lead, b: Lead) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin") {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Неверный пароль");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Вход в админ-панель</h1>
            <p className="text-slate-500 mt-2">Введите пароль для доступа к данным</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
            >
              Войти
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Дашборд Лидов</h1>
            <p className="text-slate-500 mt-1">
              Просмотр собранных email-адресов и загруженных документов
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-md">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-sm text-slate-500">Всего лидов</div>
                <div className="text-xl font-bold text-slate-900">{leads.length}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Загрузка...</div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">Нет данных</h3>
              <p className="text-slate-500">Пока никто не оставил свои контакты.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Дата</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Email</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Источник</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Детали / Файл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {format(new Date(lead.createdAt), "dd MMM yyyy, HH:mm", { locale: ru })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{lead.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          lead.source === 'calculator' 
                            ? 'bg-blue-100 text-blue-800' 
                            : lead.source === 'demo_upload'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {lead.source === 'calculator' ? 'Калькулятор ROI' : 
                           lead.source === 'demo_upload' ? 'Демо (Загрузка)' : lead.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {lead.metadata?.filename ? (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600 truncate max-w-[200px]" title={lead.metadata.filename}>
                              {lead.metadata.filename}
                            </span>
                            {lead.metadata.savedAs && (
                              <a 
                                href={`/api/uploads/${encodeURIComponent(lead.metadata.savedAs)}`} 
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-xs font-medium"
                              >
                                <Download className="w-3 h-3" />
                                Скачать
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500">
                            {lead.metadata?.employees && `Сотрудников: ${lead.metadata.employees}`}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
