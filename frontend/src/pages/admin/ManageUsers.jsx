import { useEffect, useState } from "react";
import { getOperatorsData } from "../../api/supabaseApi.js";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getOperatorsData();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery Persons</h1>
          <p className="text-slate-500 text-sm mt-1">View delivery staff accounts</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          Contact Nachiket, the creator of this app, to modify active delivery persons, update IDs, reset passwords, or for related queries.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading...</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No delivery persons found.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map((u) => (
              <div key={u.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800 text-sm">{u.full_name}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">@{u.username}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {u.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}