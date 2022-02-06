CmdUtils -- (c) 1998-2000 Matt Ginzton, MaDdoG Software
collection release 1.5: 5/28/2000
Web site: http://www.maddogsw.com/
==================================================

A collection of a few free utilities to make life at the Win9x/NT
command line a bit easier and more flexible.  Source code included.

CmdUtils currently include:
-- Recycle, a safe replacement for the DEL command, that sends files to the
   recycle bin instead of deleting them.  Recycle is also more flexible than
   DEL; you can specify multiple files at once (or use wildcards), and you
   can recycle whole directories at once (be careful!)

-- PropsFor, which displays the shell Properties dialog for all files (or
   folders, or drives) that you specify on the command line.  PropsFor also
   accepts multiple files at once, either individually or as wildcards.

-- ContextMenu (context.exe), which displays the shell context menu for the
   specified file(s); from here, with one more step, you can get Properties,
   Quick View, or any other supported action for the specified file(s).

-- Bin (bin.exe), which manipulates the recycle bin.  Caveat: it uses Windows
   functions that are not available unless you have Internet Explorer 4.0,
   Win98, or WinNT 5.0, and under Win98 they appear to be a bit buggy.  So
   you can't even use bin unless you're running one of these recent Windows
   versions, and even then, if you run "bin /empty" and then cancel,
   "bin /size" may report that the bin is empty but this is not true, and
   "bin /empty" may not do anything at all.  However "bin /empty /force"
   will still empty the recycle bin.  This appears to be Windows' fault.

-- FixP, which fixes the command-line prompt under WinNT after you've run a
   16-bit app.  (It'll work under Win95, too, but it's totally unnecessary --
   Win95 does this anyway.)  Ever notice how, after you run a 16-bit app from
   a directory with a long filename, the prompt starts using the shortname?
   If you think this looks lame, just run fixp.

-- CmdUtils-Source.zip: full source code to all of the above.

For more details, run each program with /? on the command line to list
options and other information.


Usage notes:
============
I suggest that you place these utilities in a directory on your PATH -- Win95
users, try C:\WINDOWS\COMMAND (or the COMMAND subdirectory of your Windows
directory, if it's not C:\WINDOWS).  WinNT users, try C:\WINNT, or your WinNT
directory, if you don't already have a utilities directory on your path.

If you find these utilities useful on a daily basis, feel free to rename them
to make the names easier to type -- for example, pf.exe instead of
PropsFor.exe; cm.exe instead of Context.exe, etc.  However, please distribute
them under their full names so that they can be more easily identified.

You can also use doskey to create aliases for these commands:
doskey del=recycle $*
will replace the del command with recycle.


Release history:
================
version 1.5: 5/28/2000:
  included source code for first time!
  fixed crash in fixp if you run it from a root directory (not that you'd
      ever need to do that!, but some people like to put it in a batch file
      to wrap naughty old 16-bit utilities)
  fixed propsfor and context to handle wildcards on Windows NT/2000
  added /separate argument to propsfor to change wildcard expansion to work
      more like Un*x (show each match separately)

version 1.4: 12/1/99:
  fixed propsfor and context so they can work on root directories
      (i.e. "propsfor c:\")
  added /? option to propsfor, context
  fixed context so Cut and Copy commands on context menu work properly
  added bin, which unfortunately works poorly on Win98 and not at all
      under earlier Windows versions

version 1.3: never released publicly

version 1.2: 6/28/98:
  added /f parameter to recycle
  added /text parameter and Send To support to context (unfortunately Send To
      does not work with /text, though)
  removed quikview, because no COM magic is necessary to invoke it -- just
      run c:\windows\system\viewers\quikview.exe (substitute your windows dir)
      This has the disadvantage of requiring a full path to each file, but
      the advantage of invoking the default viewer on unregistered file types.

version 1.1: 4/26/98
  added context and quikview

version 1.0: 4/14/98
  initial release


Terms and conditions:
=====================
As of version 1.5, CmdUtils are released copyleft under the terms of the GNU
General Public License (GPL) which you can find enclosed as gpl.txt.

Although CmdUtils are free, if you find them useful, I'd appreciate a note at
magi@cs.stanford.edu telling me what you think.

A short overview of the terms of the GPL follows; see gpl.txt for more details.

    CmdUtils: a collection of command-line tool interfaces to the Win95 shell
    Copyright (C) 1996-2000 Matt Ginzton / MaDdoG Software
    original author: Matt Ginzton, magi@cs.stanford.edu

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA


Visit http://www.maddogsw.com/ for updates to the programs included in CmdUtils,
as well as my other software -- try it out!
