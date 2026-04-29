import React from 'react';
import useDashboardData from '../hooks/useDashboardData';
import WebPlayback from '../components/WebPlayback';
import TopSearchBar from '../components/TopSearchBar';
import HomeFeed from '../components/HomeFeed';
import ArtistView from '../components/ArtistView';
import AlbumView from '../components/AlbumView';
import PlaylistsView from '../components/PlaylistsView';
import ProfileView from '../components/ProfileView';
import RewardsView from '../components/RewardsView';
import PlaylistModal from '../components/PlaylistModal';
import DynamicListView from '../components/DynamicListView';
import './Dashboard.css';

function Dashboard({ user, setUser, spotifyToken, spotifyId, view, setView }) {
    // 🧠 Toda la lógica compleja vive ahora en este Custom Hook
    const data = useDashboardData(user, setUser, spotifyToken, spotifyId, view, setView);

    // 🎨 Dashboard.js solo se preocupa de pintar la vista correcta
    const renderContent = () => {
        if (view === 'perfil') return <ProfileView user={user} redeemedRewards={data.redeemedRewards} editProfile={data.editProfile} />;
        if (view === 'recompensas') return <RewardsView user={user} rewards={data.rewards} redeemReward={data.redeemReward} />;
        if (view === 'listas') return <PlaylistsView selectedPlaylist={data.selectedPlaylist} setSelectedPlaylist={data.setSelectedPlaylist} myPlaylists={data.myPlaylists} playlistSongs={data.playlistSongs} loading={data.loading} editPlaylist={data.editPlaylist} createPlaylist={data.createPlaylist} openPlaylist={data.openPlaylist} removeFromPlaylist={data.removeFromPlaylist} playContent={data.playContent} />;
        if (view === 'artistas') return <div className="results-section"><h2>Artistas seguidos</h2><div className="grid-container">{data.followedArtists.map(a => <div key={a.id} className="artist-card" onClick={() => data.selectArtist({id: a.spotify_artist_id, name: a.name, images: [{url: a.image_url}]})}><img src={a.image_url} className="artist-image" alt="" /><div className="artist-name">{a.name}</div></div>)}</div></div>;
        if (view === 'inicio' && data.selectedDynamicList) return <DynamicListView selectedDynamicList={data.selectedDynamicList} setSelectedDynamicList={data.setSelectedDynamicList} resolvingUri={data.resolvingUri} setShowPlaylistModal={data.setShowPlaylistModal} playContent={data.playContent} />;
        if (data.selectedArtist && data.selectedAlbum) return <AlbumView selectedAlbum={data.selectedAlbum} selectedArtist={data.selectedArtist} albumTracks={data.albumTracks} loading={data.loading} formatDuration={data.formatDuration} setShowPlaylistModal={data.setShowPlaylistModal} playContent={data.playContent} setSelectedAlbum={data.setSelectedAlbum} />;
        if (data.selectedArtist) return <ArtistView selectedArtist={data.selectedArtist} isFollowing={data.isFollowing} toggleFollow={data.toggleFollow} clearSearch={data.clearSearch} activeTab={data.activeTab} setActiveTab={data.setActiveTab} loading={data.loading} albums={data.albums} eps={data.eps} singles={data.singles} selectAlbum={data.selectAlbum} playContent={data.playContent} />;
        
        return <HomeFeed homeFeed={data.homeFeed} playContent={data.playContent} setSelectedDynamicList={data.setSelectedDynamicList} />;
    };

    return (
        <div className="dashboard-container">
            <TopSearchBar 
                searchQuery={data.searchQuery} setSearchQuery={data.setSearchQuery} handleSearch={data.handleSearch} 
                isSearchOpen={data.isSearchOpen} setIsSearchOpen={data.setIsSearchOpen} searchResults={data.searchResults} 
                resolvingUri={data.resolvingUri} selectArtist={data.selectArtist} setShowPlaylistModal={data.setShowPlaylistModal} 
                playContent={data.playContent} 
            />
            
            <div className="dashboard-scrollable-content">{renderContent()}</div>

            {data.showPlaylistModal && (
                <PlaylistModal 
                    showPlaylistModal={data.showPlaylistModal} myPlaylists={data.myPlaylists} 
                    addToPlaylist={data.addToPlaylist} setShowPlaylistModal={data.setShowPlaylistModal} 
                />
            )}

            {spotifyToken && (
                <WebPlayback 
                    token={spotifyToken} spotifyId={spotifyId} playingArtist={data.playingArtistData} 
                    user={user} setUser={setUser} trackUri={data.currentUri} 
                />
            )}
        </div>
    );
}

export default Dashboard;