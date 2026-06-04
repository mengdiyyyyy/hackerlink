import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AppLayout } from '@/pages/AppLayout';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { Question1Screen } from '@/components/onboarding/Question1Screen';
import { Question4Screen } from '@/components/onboarding/Question4Screen';
import { TwinReadyScreen } from '@/components/onboarding/TwinReadyScreen';
import { MainTabs } from '@/pages/MainTabs';
import { ExploreModal } from '@/components/main/ExploreModal';
import { TwinDepartureTransition } from '@/components/main/TwinDepartureTransition';
import { SoulSliceGrid } from '@/components/main/SoulSliceGrid';
import { SoulSliceGridWithSelection } from '@/components/main/SoulSliceGridWithSelection';
import { SoulSliceDetail } from '@/components/main/SoulSliceDetail';
import { TwinChatConversation } from '@/components/main/TwinChatConversation';
import { MeetOfflineInvitation } from '@/components/main/MeetOfflineInvitation';
import { MeetingInvitationReceiver } from '@/components/main/MeetingInvitationReceiver';
import { PostMeetingFeedback } from '@/components/main/PostMeetingFeedback';
import { NetworkTabWithGraph } from '@/components/main/NetworkTabWithGraph';
import { RelationDetailCard } from '@/components/main/RelationDetailCard';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Onboarding flow */}
        <Route path="/" element={<Navigate to="/welcome" replace />} />
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/onboarding/q1" element={<Question1Screen />} />
        <Route path="/onboarding/q4" element={<Question4Screen />} />
        <Route path="/onboarding/twin-ready" element={<TwinReadyScreen />} />

        {/* Main app */}
        <Route element={<AppLayout />}>
          <Route path="/app" element={<MainTabs />} />
          <Route path="/app/explore" element={<ExploreModal />} />
          <Route path="/app/departing" element={<TwinDepartureTransition />} />
          <Route path="/app/results" element={<SoulSliceGrid />} />
          <Route path="/app/results/select" element={<SoulSliceGridWithSelection />} />
          <Route path="/app/soul/:twinId" element={<SoulSliceDetail />} />
          <Route path="/app/chat/:conversationId" element={<TwinChatConversation />} />
          <Route path="/app/meet/:conversationId" element={<MeetOfflineInvitation />} />
          <Route path="/app/invitation/:meetingId" element={<MeetingInvitationReceiver />} />
          <Route path="/app/feedback/:meetingId" element={<PostMeetingFeedback />} />
          <Route path="/app/network" element={<NetworkTabWithGraph />} />
          <Route path="/app/relation/:relationId" element={<RelationDetailCard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
