import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const useSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "subjects"), (snapshot) => {
      const newData = [];
      snapshot.forEach((doc) => {
        newData.push({ id: doc.id, ...doc.data() });
      });
      setSubjects(newData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { subjects, loading };
};

export default useSubjects;
