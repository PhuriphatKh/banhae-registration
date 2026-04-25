// hooks/useClassLevels.js
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase"; // ปรับ path ตามจริง

const useClassLevels = () => {
  const [levels, setLevels] = useState([]); // เก็บ list ชั้นเรียน
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLevels = async () => {
      try {
        // Query ไปที่ collection "class_levels"
        // แนะนำให้ order ตาม field ที่เราเตรียมไว้ (เช่น field 'order' หรือ ID)
        const q = query(collection(db, "class_levels"), orderBy("order")); 
        
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setLevels(data);
      } catch (err) {
        console.error("Error fetching class levels:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLevels();
  }, []);

  // Return ค่าออกไปใช้งาน
  return { levels, loading, error };
};

export default useClassLevels;