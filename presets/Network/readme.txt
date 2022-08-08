Network drives don't have Recycle Bin by default, so files are 
permanently deleted without possible restoration. As a workaround, 
the Recycle Bin may be configured to include additional folders/drives. 

3 reg files and 1 bat file should be present along this readme:
	cleanEntries.reg		-> To revert the changes in both cases
	network32.reg			-> For x32 systems
	network64.reg			-> For x64 systems
	create_new_guid.bat		-> To create new GUID's easily

To add the network drive just run any of the corresponding reg files
according to your system. To revert the changes, the same. In any case
the reg files MUST BE EDITED before applying them.

The 'networkXX' files have some entries which contains these keys:
	"RelativePath"="X:\\"	-> Must match the drive letter
	[...]
	"Name"="XDrive"			-> Must match the drive label

Path and drive name must be changed according to your config.

Note the registry entries have a name using a GUID like this:
	'...\{9147E464-33A6-48E2-A3C9-361EFD417DEF}'

This GUID should be changed when adding more than one network drive
to the Recycle Bin, since each drive should have its own entries.
Most users will only add one drive, so the default GUID will work as is.

The 'cleanEntries' filehave some entries like this:
	[-...\{9147E464-33A6-48E2-A3C9-361EFD417DEF}]

Note the GUID matches the one found at the other files. Same comments 
apply when adding more than one drive. When adding multiple drives,
there would be a unique pair of 'networkXX' and 'cleanEntries' files
per drive (each pair with a different GUID).

To retrieve new GUID's, the bat file may be used. It should work on any
Windows system which can run PowerShell commands (Win 7 and later). 

No further support will be given related to this (since is not an script 
related topic), but more info can be found here if needed:
https://social.technet.microsoft.com/forums/windows/en-us/a349801f-398f-4139-8e8b-b0a92f599e2b/enable-recycle-bin-on-mapped-network-drives