import { useState, useEffect } from 'react';
import Card from '@/components/common/Card';
import Loader from '@/components/common/Loader';
import Badge from '@/components/common/Badge';
import { competitionService } from '@/services/competitionService';
import { FiAward, FiUser, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Leaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, competition

    useEffect(() => {
        fetchLeaderboard();
    }, [filter]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const params = filter === 'competition' ? { examType: 'competition' } : {};
            const response = await competitionService.getGlobalLeaderboard(params);
            setLeaderboard(response.data);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            toast.error('Failed to load leaderboard');
        } finally {
            setLoading(false);
        }
    };

    const getRankBadge = (index) => {
        switch (index) {
            case 0: return <FiAward className="w-8 h-8 text-yellow-500" />;
            case 1: return <FiAward className="w-8 h-8 text-gray-400" />;
            case 2: return <FiAward className="w-8 h-8 text-orange-500" />;
            default: return <span className="text-xl font-bold text-gray-500">#{index + 1}</span>;
        }
    };

    if (loading) return <Loader fullScreen />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Global Leaderboard</h1>
                    <p className="text-gray-600 mt-1">Top performers across all colleges</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'}`}
                    >
                        All Time
                    </button>
                    <button
                        onClick={() => setFilter('competition')}
                        className={`px-4 py-2 rounded-lg ${filter === 'competition' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'}`}
                    >
                        Competitions
                    </button>
                </div>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg %</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {leaderboard.map((entry, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center justify-center w-12">
                                            {getRankBadge(index)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <FiUser className="text-gray-500" />
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{entry.studentName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-sm text-gray-500">
                                            <FiMapPin className="mr-2 text-gray-400" />
                                            {entry.collegeName || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{entry.totalScore}</div>
                                        <div className="text-xs text-gray-500">{entry.totalExams} Exams</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge variant={entry.avgPercentage >= 90 ? 'success' : entry.avgPercentage >= 75 ? 'primary' : 'warning'}>
                                            {entry.avgPercentage.toFixed(1)}%
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {leaderboard.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            No data available yet.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Leaderboard;
