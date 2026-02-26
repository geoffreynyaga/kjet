import { ErrorState, LoadingState } from './LoadingAndErrorStates.tsx';
import { useApplicantData, useApplicationFiles } from './hooks.ts';
import { useNavigate, useParams } from 'react-router-dom';

import { ApplicantHeader } from './ApplicantHeader.tsx';
import { FilesSidebar } from './FilesSidebar.tsx';
import React from 'react';
import { ScoreBreakdownSection } from './ScoreBreakdownSection.tsx';
import { motion } from 'framer-motion';

function ApplicantDetail() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();

  const { applicant, countyApplicants, loading: applicantLoading, error: applicantError } = useApplicantData(applicationId);
  const { files, loading: filesLoading } = useApplicationFiles(applicationId);

  const handleBack = () => navigate(-1);

  if (applicantLoading) {
    return <LoadingState />;
  }

  if (applicantError || !applicant) {
    return <ErrorState error={applicantError || 'Applicant not found'} onBack={handleBack} />;
  }

  return (
    <div className="relative w-full min-h-screen mx-auto overflow-hidden ">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none" style={{ minHeight: '200vh' }}>
        {/* Large Blue Orb - Main floating element */}
        <motion.div
          className="absolute w-[400px] h-[400px] bg-gradient-to-br from-blue-200/40 via-indigo-200/30 to-purple-200/25 rounded-full blur-3xl"
          initial={{ x: "-40vw", y: "-30vh", scale: 0.8, opacity: 0 }}
          animate={{
            x: ["80vw", "-40vw", "80vw"],
            y: ["-30vh", "120vh", "-30vh", "60vh", "-30vh"],
            scale: [0.8, 1.0, 0.9, 1.1, 0.8],
            opacity: [0, 0.5, 0.3, 0.4, 0.2]
          }}
          transition={{
            duration: 50,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Secondary Green Orb */}
        <motion.div
          className="absolute rounded-full w-80 h-80 bg-gradient-to-br from-green-200/35 via-emerald-200/25 to-teal-200/20 blur-3xl"
          initial={{ x: "-50vw", y: "150vh", scale: 0.9, opacity: 0 }}
          animate={{
            x: ["100vw", "-50vw", "100vw"],
            y: ["-20vh", "150vh", "80vh", "-20vh"],
            scale: [0.9, 1.2, 0.7, 1.0, 0.9],
            opacity: [0, 0.3, 0.5, 0.2, 0.4]
          }}
          transition={{
            duration: 65,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3
          }}
        />

        {/* Floating Circle 1 - Application themed */}
        <motion.div
          className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-cyan-200/45 to-blue-300/35 blur-2xl"
          initial={{ x: "40vw", y: "15vh" }}
          animate={{
            x: ["15vw", "70vw", "15vw", "70vw", "15vw"],
            y: ["15vh", "100vh", "140vh", "70vh", "15vh"],
            scale: [1, 1.2, 0.8, 1.1, 1],
            rotate: [0, 180, 360, 540, 720]
          }}
          transition={{
            duration: 45,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />

        {/* Floating Circle 2 - Document themed */}
        <motion.div
          className="absolute rounded-full w-28 h-28 bg-gradient-to-br from-orange-200/40 to-yellow-300/30 blur-2xl"
          initial={{ x: "75vw", y: "120vh" }}
          animate={{
            x: ["75vw", "20vw", "50vw", "75vw"],
            y: ["120vh", "10vh", "80vh", "120vh"],
            scale: [1, 0.6, 1.3, 0.9, 1],
            rotate: [0, -90, -180, -270, -360]
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 6
          }}
        />

        {/* Floating Circle 3 - Score themed */}
        <motion.div
          className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-pink-200/45 to-rose-300/35 blur-xl"
          initial={{ x: "60vw", y: "30vh" }}
          animate={{
            x: [
              "60vw", "70vw", "75vw", "70vw", "60vw",
              "50vw", "45vw", "50vw", "60vw"
            ],
            y: [
              "30vh", "20vh", "110vh", "45vh", "140vh",
              "45vh", "30vh", "20vh", "30vh"
            ],
            scale: [1, 1.3, 0.6, 1.1, 0.8, 1.0, 0.9, 1.2, 1],
            rotate: [0, 45, 90, 135, 180, 225, 270, 315, 360]
          }}
          transition={{
            duration: 35,
            repeat: Infinity,
            ease: "linear",
            delay: 9
          }}
        />

        {/* Additional wandering elements */}
        <motion.div
          className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-purple-200/35 to-violet-300/25 blur-lg"
          initial={{ x: "85vw", y: "70vh" }}
          animate={{
            x: ["85vw", "15vw", "45vw", "85vw"],
            y: ["70vh", "120vh", "160vh", "70vh"],
            scale: [0.8, 1.1, 0.9, 1.0, 0.8],
            opacity: [0.3, 0.6, 0.4, 0.5, 0.3]
          }}
          transition={{
            duration: 48,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 12
          }}
        />

        <motion.div
          className="absolute rounded-full w-26 h-26 bg-gradient-to-br from-indigo-200/40 to-blue-300/30 blur-xl"
          initial={{ x: "20vw", y: "10vh" }}
          animate={{
            x: ["20vw", "65vw", "35vw", "55vw", "20vw"],
            y: ["10vh", "150vh", "100vh", "130vh", "10vh"],
            scale: [1, 0.7, 1.2, 0.9, 1],
            rotate: [0, 120, 240, 360]
          }}
          transition={{
            duration: 60,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 8
          }}
        />

        {/* Subtle Gradient Waves */}
        <motion.div
          className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-indigo-100/25 via-blue-100/15 to-transparent blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.4, 0.2, 0.3] }}
          transition={{
            duration: 25,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />

        <motion.div
          className="absolute top-0 right-0 w-full h-32 bg-gradient-to-b from-cyan-100/20 via-teal-100/10 to-transparent blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0.5, 0.2] }}
          transition={{
            duration: 12,
            repeat: Infinity,
            repeatType: "reverse",
            delay: 2
          }}
        />
      </div>

      <div className="relative z-10 w-full">
        <ApplicantHeader applicant={applicant} countyApplicants={countyApplicants} onBack={handleBack} />

        <div className="flex flex-col w-full p-8 lg:space-x-4 justify-evenly lg:flex-row ">
            {/* Left Column - Data (80%) */}
            <div className="flex w-7/10">
              <ScoreBreakdownSection applicant={applicant} />
            </div>

            {/* Right Column - Files (20%) */}
            <div className="flex w-3/10">
              <FilesSidebar files={files} loading={filesLoading} />
            </div>
        </div>
      </div>
    </div>
  );
}

export default ApplicantDetail;
