import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Loader from '@/components/common/Loader';
import Badge from '@/components/common/Badge';
import { competitionService } from '@/services/competitionService';
import { formatDateTime } from '@/utils/dateUtils';
import { FiAward, FiCalendar, FiClock, FiTarget, FiCode } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Competitions = () => {
    const navigate = useNavigate();
    const [competitions, setCompetitions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCompetitions();
    }, []);

    const fetchCompetitions = async () => {
        try {
            const response = await competitionService.getStudentCompetitions();
            setCompetitions(response.data || []);
        } catch (error) {
            console.error('Error fetching competitions:', error);
            toast.error('Failed to load competitions');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loader fullScreen />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Competitions & Hackathons</h1>
                    <p className="text-gray-600 mt-1">Participate in global challenges and prove your skills</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {competitions.length > 0 ? (
                    competitions.map((comp) => (
                        <Card key={comp._id} className="hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <FiAward className="w-6 h-6 text-purple-600" />
                                </div>
                                <Badge variant="primary">Active</Badge>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2">{comp.title}</h3>
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{comp.description}</p>

                            <div className="space-y-2 mb-6">
                                <div className="flex items-center text-sm text-gray-500">
                                    <FiCalendar className="w-4 h-4 mr-2" />
                                    <span>{formatDateTime(comp.startTime)}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-500">
                                    <FiClock className="w-4 h-4 mr-2" />
                                    <span>{comp.duration} mins</span>
                                </div>
                            </div>

                            <Button
                                fullWidth
                                onClick={() => navigate(`/student/exams/${comp._id}`)}
                            >
                                Participate Now
                            </Button>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <FiAward className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No Active Competitions</h3>
                        <p className="text-gray-500">Check back later for new programming challenges!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Competitions;
