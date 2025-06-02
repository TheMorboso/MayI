import * as cheerio from 'cheerio/slim';

// Define TeamTierType based on TIER_OPTIONS in teams.tsx for consistency
export type TeamTierType = "TierS" | "TierSred" | "TierA" | "TierC" | "Red" | "World";
export interface ScrapedTeamInfo {
  originalUrl: string;
  teamEmblemSrc: string | null;
  firstNavLinkText: string | null;
  teamName?: string | null;
  firstNavLinkHref?: string | null;
  error?: string;
  tier?: TeamTierType | null;
}


export async function scrapeWorldFootballTeamData(url: string): Promise<ScrapedTeamInfo> {
  try {
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`;
    }

    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return {
        originalUrl: url,
        teamEmblemSrc: null,
        firstNavLinkText: null,
        teamName: null,
        error: `Error al acceder a la URL: ${response.status}`,
      };
    }

    const htmlText = await response.text();
    const $ = cheerio.load(htmlText);

    const emblemSelector = '#site > div.white > div.sidebar > div.box.emblemwrapper > div:nth-child(2) > div.emblem > a > img';
    const teamEmblemSrc = $(emblemSelector).attr('src') || null;

    const navLinkElement = $('#navi > div.subnavi > ul > li:nth-child(1) > a');
    const firstNavLinkText = navLinkElement.text().trim() || null;
    let firstNavLinkHref = navLinkElement.attr('href')?.trim() || null;

    const teamNameSelector = '#site > div.white > div.sidebar > div.box.emblemwrapper > div.head > h2';
    const teamName = $(teamNameSelector).text().trim() || null;
    
    let absoluteEmblemSrc = teamEmblemSrc;
    if (teamEmblemSrc && !teamEmblemSrc.startsWith('http')) {
        const siteBaseUrl = new URL(fullUrl).origin;
        absoluteEmblemSrc = new URL(teamEmblemSrc, siteBaseUrl).href;
    }
    if (firstNavLinkHref && !firstNavLinkHref.startsWith('http')) {
        const siteBaseUrl = new URL(fullUrl).origin;
        firstNavLinkHref = new URL(firstNavLinkHref, siteBaseUrl).href;
    }


    return {
      originalUrl: url,
      teamEmblemSrc: absoluteEmblemSrc,
      firstNavLinkText: firstNavLinkText,
      teamName: teamName,
      firstNavLinkHref: firstNavLinkHref,
    };

  } catch (error: any) {
    return {
      originalUrl: url,
      teamEmblemSrc: null,
      firstNavLinkText: null,
      teamName: null,
      firstNavLinkHref: null,
      error: error.message || 'Error desconocido durante el scraping',
    };
  }
}
