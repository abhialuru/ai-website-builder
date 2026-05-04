"use client"
import { useEffect, useState } from "react";
import { WebContainer } from '@webcontainer/api';

export function useWebContainer() {
    const [webcontainer, setWebcontainer] = useState<WebContainer | null>(null);

    async function main() {
        const webcontainer = await WebContainer.boot();
        setWebcontainer(webcontainer);
    }
 
    useEffect(()=>{
        main()
    },[])
    
    return webcontainer;
}