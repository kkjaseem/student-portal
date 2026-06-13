import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminMetrics, getAdminVerifications } from '../api/index.js'

const STATUS_COLORS = {
  VERIFIED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  INITIATED: 'bg-yellow-100 text-yellow-700',
  PENDING: 'bg-blue-100 text-blue-700',
}

export default function AdminPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data: metrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: getAdminMetrics,
    refetchInterval: 30000,
  })

  const { data: verificationsData, isLoading } = useQuery({
    queryKey: ['admin-verifications', search, statusFilter, page],
    queryFn: () => getAdminVerifications({ search, status: statusFilter, page, limit: 20 }),
    keepPreviousData: true,
  })

  const metricCards = [
    { label: 'Total Applications', value: metrics?.totalApplications ?? '—', color: 'bg-blue-600' },
    { label: 'Verified', value: metrics?.totalVerified ?? '—', color: 'bg-green-600' },
    { label: 'Failed', value: metrics?.totalFailed ?? '—', color: 'bg-red-500' },
    { label: 'Success Rate', value: metrics ? `${metrics.successPercentage}%` : '—', color: 'bg-purple-600' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Monitor Aadhaar verification status across all applications</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {metricCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className={`${card.color} h-1`} />
            <div className="p-5">
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & filter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search by name, application ID, or request ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="form-input max-w-sm" />
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="form-input w-40">
            <option value="">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="FAILED">Failed</option>
            <option value="INITIATED">Initiated</option>
            <option value="PENDING">Pending</option>
          </select>
          <span className="text-sm text-gray-500 ml-auto">
            {verificationsData?.total ?? 0} results
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Application ID', 'Name', 'Email', 'Status', 'Request ID', 'Verified At'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td>
                </tr>
              ) : verificationsData?.data?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No records found</td>
                </tr>
              ) : verificationsData?.data?.map(row => (
                <tr key={row.application_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {row.application_id?.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.first_name} {row.last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.email}</td>
                  <td className="px-4 py-3">
                    {row.verification_status ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                        ${STATUS_COLORS[row.verification_status] || 'bg-gray-100 text-gray-600'}`}>
                        {row.verification_status}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Not started</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    {row.request_id ? row.request_id.slice(0, 12) + '...' : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {row.verified_at ? new Date(row.verified_at).toLocaleString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {verificationsData && verificationsData.total > 20 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary py-1.5 px-3 text-xs">
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {Math.ceil(verificationsData.total / 20)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(verificationsData.total / 20)}
              className="btn-secondary py-1.5 px-3 text-xs">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
