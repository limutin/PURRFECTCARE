import { createContext, useContext } from 'react';

/** Lets any screen open a patient's profile page (provided by the dashboards). */
export const PatientNavContext = createContext<{ openPatient: (petId: string) => void } | null>(null);

export const usePatientNav = () => useContext(PatientNavContext);
