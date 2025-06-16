'use client'
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '../components/ui/dialog';
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { Badge } from "./ui/badge";
import packageJson from '../../package.json';

interface Contributor {
  name: string;
  github: string;
  avatar: string;
  role?: string;
}

interface ContributorsProps {
  darkMode: boolean;
}

const contributors: Contributor[] = [
  {
    name: "Aman Maheshwari",
    github: "Amanmahe",
    avatar: "https://avatars.githubusercontent.com/Amanmahe",
  },
  {
    name: "Deepak Khatri",
    github: "lorforlinux",
    avatar: "https://avatars.githubusercontent.com/u/20015794?v=4",
  },
  {
    name: "Krishnanshu Mittal",
    github: "CIumsy",
    avatar: "https://avatars.githubusercontent.com/u/76506050?v=4",
  },
  {
    name: "Ritika Mishra",
    github: "Ritika8081",
    avatar: "https://avatars.githubusercontent.com/u/103934960?v=4",
  },
];

export default function Contributors({ darkMode }: ContributorsProps) {
  const iconBtnClasses = `p-1 rounded-full transition-all duration-300 ${darkMode ? 'text-zinc-200 hover:bg-zinc-700' : 'text-stone-700 hover:bg-zinc-200'
    } shadow-sm hover:shadow-md`;
  const primaryAccent = darkMode ? "text-amber-300" : "text-amber-600";
  const textPrimary = darkMode ? "text-stone-300" : "text-stone-800";

  return (
    <Dialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <button
                type="button"
                className={iconBtnClasses}
                aria-label="View contributors"
              >
                <CircleAlert className="h-5 w-5 cursor-pointer" />
              </button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p className={`${!darkMode ? "bg-[#252529]" : "bg-[#FFFFFF] text-black"}`}>Contributors</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className={`max-w-[90vw] sm:max-w-[650px] ${darkMode ? "bg-[#252529]" : "bg-[#FFFFFF]"}`} style={{ padding: "10px" }}>
        <DialogTitle className="text-2xl font-semibold">
          <div className="flex items-center space-x-4 gap-2">
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-light tracking-tight">
              <span className={`font-bold ${textPrimary}`}>Cort</span>
              <span className={`${primaryAccent} font-bold`}>EX</span>
            </h1>
            <Badge  className={`text-xs ${darkMode ? 'text-[#252529] bg-[#94A3B8]' : 'text-[#FFFFFF] bg-[#64748B]'}`} style={{padding:"2px"}}>
              v{packageJson.version}
            </Badge>
          </div>
        </DialogTitle>

        <Card className="border-none shadow-none">
          <CardHeader className="p-0 mb-4">
            <div className="flex flex-col items-center w-full">
              <p className={`text-2xl font-semibold ${!darkMode ? "text-[#252529]" : "text-[#FFFFFF]"}`}>Contributors</p>
              <div className={`flex items-center text-sm gap-2 mb-2 ${!darkMode ? "text-[#252529]" : "text-[#FFFFFF]"}`}>
                Listed alphabetically
              </div>
              <div className={`w-full h-[1px] ${!darkMode ? "bg-stone-200" : "bg-zinc-700"} my-2`} style={{ margin: "10px" }} />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {contributors.map((contributor) => (
                <ContributorCard
                  key={contributor.github}
                  contributor={contributor}
                  darkMode={darkMode}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

function ContributorCard({ contributor, darkMode }: { contributor: Contributor, darkMode: boolean }) {
  return (
    <Link
      href={`https://github.com/${contributor.github}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group"
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center space-y-3 p-3 rounded-lg transition-all duration-200 hover:bg-accent">
              <Avatar className="h-16 w-16 border-2 border-transparent group-hover:border-primary">
                <AvatarImage
                  src={`${contributor.avatar}?size=128`}
                  alt={contributor.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {contributor.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>

              <div className={`text-center ${!darkMode ? "text-[#252529]" : "text-[#FFFFFF]"}`}>
                <p className="font-medium group-hover:text-primary transition-colors">
                  {contributor.name}
                </p>

                <p className="text-xs mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  @{contributor.github}
                </p>
              </div>
            </div>
          </TooltipTrigger>

        </Tooltip>
      </TooltipProvider>
    </Link>
  );
}