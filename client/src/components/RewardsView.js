import React, { useState, useEffect } from 'react';
import { Gift, Clock, Star } from 'lucide-react';
import './RewardsView.css'; 

function RewardsView({ user, rewards, redeemReward }) {
    const [timeLeft, setTimeLeft] = useState('');

    // Lógica del reloj de cuenta atrás hasta medianoche
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0); // Siguiente medianoche
            const diff = midnight - now;

            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const specialReward = rewards?.special;
    const normalRewards = rewards?.normals || [];

    return (
        <div className="rewards-wrapper">
            <div className="rewards-header-flex">
                <h2><Gift size={24} style={{verticalAlign: 'middle', marginRight: '10px'}} /> Tienda de Recompensas</h2>
                <div className="countdown-timer">
                    <Clock size={18} style={{marginRight: '6px'}} />
                    Se actualiza en: <span>{timeLeft}</span>
                </div>
            </div>

            <div className="shop-layout">
                {/* LADO IZQUIERDO: EL REGALO ESPECIAL */}
                <div className="shop-special-col">
                    <div className="special-badge">⭐ DESTACADO DE HOY</div>
                    {specialReward ? (
                        <div className="reward-card special-card" onClick={() => redeemReward(specialReward)}>
                            <img src={specialReward.photo_url || 'https://via.placeholder.com/400'} alt={specialReward.name} />
                            <div className="reward-info">
                                <h3>{specialReward.name}</h3>
                                <p>{specialReward.description}</p>
                                <button className="btn-redeem special-btn">
                                    Canjear <Star size={14} fill="currentColor" style={{margin:'0 4px'}} /> {specialReward.point_cost} pts
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="reward-card special-card empty">No hay destacado hoy</div>
                    )}
                </div>

                {/* LADO DERECHO: EL DADO DE 4 REGALOS */}
                <div className="shop-normal-col">
                    {normalRewards.map((reward, index) => (
                        <div key={index} className="reward-card normal-card" onClick={() => redeemReward(reward)}>
                            <img src={reward.photo_url || 'https://via.placeholder.com/200'} alt={reward.name} />
                            <div className="reward-info">
                                <h4>{reward.name}</h4>
                                <button className="btn-redeem">
                                    {reward.point_cost} pts
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default RewardsView;